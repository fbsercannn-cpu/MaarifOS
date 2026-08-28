import type { ActiveClassroomScope } from "../../core/domain/classroom-scope.ts";
import type { DataSnapshot, StoredRecord } from "../../core/domain/model.ts";
import {
  A4_PDF_CANVAS_HEIGHT,
  A4_PDF_CANVAS_WIDTH,
  createA4ImagePdf,
  jpegDataUrlBytes,
} from "../documents/canvas-image-pdf.ts";
import {
  createSemanticTaggedPdf,
  semanticTaggedPdfPageCount,
  type SemanticPdfNode,
  type SemanticTaggedPdfRuntime,
} from "../documents/semantic-tagged-pdf.ts";

export const CLASS_ROSTER_DOCUMENT_FORMAT = "html" as const;
export const CLASS_ROSTER_DOCUMENT_MIME_TYPE = "text/html;charset=utf-8" as const;
export const CLASS_ROSTER_HTML_FILE_SIGNATURE = "<!doctype html>" as const;
export const CLASS_ROSTER_DOCUMENT_KIND = "class-roster" as const;
export const CLASS_ROSTER_PDF_FORMAT = "pdf" as const;
export const CLASS_ROSTER_PDF_MIME_TYPE = "application/pdf" as const;
export const CLASS_ROSTER_PDF_FILE_SIGNATURE = "%PDF-" as const;

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
  preview: "local-html" as const,
  download: "pdf-file" as const,
  print: "pdf-viewer" as const,
  share: "web-share-file-with-download-fallback" as const,
  pdf: "generated" as const,
});

export interface ClassRosterDocumentInput {
  readonly scope: ActiveClassroomScope;
  readonly snapshot: Pick<DataSnapshot, "academicYears" | "classrooms" | "students">;
  readonly schoolName: string;
  readonly teacherName: string;
  /** UTC ISO-8601. Varsayılan, üretim anıdır. */
  readonly generatedAt?: string;
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
    kind: "local-html";
    title: string;
    html: string;
    mimeType: typeof CLASS_ROSTER_DOCUMENT_MIME_TYPE;
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

interface RosterContact {
  readonly label: string;
  readonly phone: string;
}

interface RosterRow {
  readonly id: string;
  readonly studentNumber: string;
  readonly fullName: string;
  readonly nationalIdentityNumber: string;
  readonly contacts: readonly RosterContact[];
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

function contactsFromStudent(student: StoredRecord): RosterContact[] {
  if (!Array.isArray(student.contacts)) return [];
  return student.contacts.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      return [];
    }
    const contact = candidate as Record<string, unknown>;
    const relationship = nonEmptyText(contact.relationship);
    const name = nonEmptyText(contact.name);
    const phone = nonEmptyText(contact.phone);
    if (!relationship && !name && !phone) return [];
    const baseLabel = name && relationship
      ? `${name} (${relationship})`
      : name ?? relationship ?? "—";
    const permissions = [
      contact.isEmergencyContact === true ? "Acil iletişim" : null,
      contact.isAuthorizedPickup === true ? "Teslim yetkili" : null,
    ].filter((value): value is string => value !== null);
    const label = permissions.length > 0
      ? `${baseLabel} · ${permissions.join(" · ")}`
      : baseLabel;
    return [{ label, phone: phone ?? "—" }];
  });
}

function rosterRows(
  students: readonly StoredRecord[],
  scope: ActiveClassroomScope,
): RosterRow[] {
  return students
    .filter((student) => recordIsInActiveScope(student, scope))
    .map((student) => ({
      id: student.id,
      studentNumber: nonEmptyText(student.optionalCode) ?? "—",
      fullName: nonEmptyText(student.displayName) ?? "Adı girilmemiş öğrenci",
      nationalIdentityNumber:
        nonEmptyText(student.nationalIdentityNumber) ?? "—",
      contacts: contactsFromStudent(student),
    }))
    .sort(
      (left, right) =>
        turkishNameCollator.compare(left.fullName, right.fullName) ||
        turkishNameCollator.compare(left.id, right.id),
    );
}

function contactLines(
  contacts: readonly RosterContact[],
  field: keyof RosterContact,
): string {
  if (contacts.length === 0) return '<span class="empty-value">—</span>';
  return contacts
    .map((contact) => `<div class="contact-line">${escapeHtml(contact[field])}</div>`)
    .join("");
}

const STANDARD_PAGE_ROW_BUDGET_MM = 228;
const SIGNATURE_PAGE_ROW_BUDGET_MM = 196;
const STANDARD_PAGE_BALANCE_WEIGHT = 228;
const SIGNATURE_PAGE_BALANCE_WEIGHT = 196;

function estimatedWrappedLines(value: string, charactersPerLine: number): number {
  return Math.max(1, Math.ceil(value.length / charactersPerLine));
}

/**
 * Tarayıcı baskı motorunun son sayfaya yalnız imza bırakmasını önlemek için
 * satırı, en dar sütunda oluşabilecek doğal sarmalara göre ihtiyatlı ölçer.
 * Sabit satır yüksekliği uygulanmaz; gerçek içerik yine serbestçe büyür.
 */
function estimatedRosterRowHeightMm(row: RosterRow): number {
  // A4 tablo sütunlarının gerçek 9pt yazı genişliğine göre ihtiyatlı karakter
  // bütçeleri. Özellikle uzun Türkçe unvanlar ve biçimlendirilmiş telefonlar
  // tarayıcıda estimator'ın önceki değerinden daha erken sarılıyor.
  const nameLines = estimatedWrappedLines(row.fullName, 15);
  const contactLabelLines = row.contacts.length === 0
    ? 1
    : row.contacts.reduce(
        (sum, contact) => sum + estimatedWrappedLines(contact.label, 18),
        0,
      );
  const contactPhoneLines = row.contacts.length === 0
    ? 1
    : row.contacts.reduce(
        (sum, contact) => sum + estimatedWrappedLines(contact.phone, 13),
        0,
      );
  const separatorAllowance = Math.max(0, row.contacts.length - 1) * 1.8;
  const contentLines = Math.max(nameLines, contactLabelLines, contactPhoneLines);
  return 5 + contentLines * 4 + separatorAllowance;
}

function paginateRosterRows(rows: readonly RosterRow[]): RosterRow[][] {
  if (rows.length === 0) return [[]];
  const heights = rows.map(estimatedRosterRowHeightMm);
  const totalHeight = heights.reduce((sum, height) => sum + height, 0);
  let pageCount = 1;
  while (
    totalHeight >
    (pageCount - 1) * STANDARD_PAGE_ROW_BUDGET_MM +
      SIGNATURE_PAGE_ROW_BUDGET_MM
  ) {
    pageCount += 1;
  }

  // Toplam yükseklik hesabı satırların bölünebildiğini varsayar. Uzun ve
  // birbirinden farklı satırlar son sayfaya yığıldığında bu varsayım tutmaz;
  // son satırların sessizce dışarıda kalmasına asla izin vermeden sayfa sayısını
  // artırıp yeniden dengeleriz.
  while (pageCount <= rows.length) {
    const pages: RosterRow[][] = [];
    const pageHeights: number[] = [];
    let rowIndex = 0;
    let remainingHeight = totalHeight;
    let remainingBalanceWeight =
      (pageCount - 1) * STANDARD_PAGE_BALANCE_WEIGHT +
      SIGNATURE_PAGE_BALANCE_WEIGHT;
    for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
      const pagesAfterThis = pageCount - pageIndex - 1;
      const capacity = pagesAfterThis === 0
        ? SIGNATURE_PAGE_ROW_BUDGET_MM
        : STANDARD_PAGE_ROW_BUDGET_MM;
      const balanceWeight = pagesAfterThis === 0
        ? SIGNATURE_PAGE_BALANCE_WEIGHT
        : STANDARD_PAGE_BALANCE_WEIGHT;
      const targetHeight =
        remainingHeight * (balanceWeight / remainingBalanceWeight);
      const startIndex = rowIndex;
      let used = 0;
      if (pagesAfterThis === 0) {
        while (rowIndex < rows.length) {
          used += heights[rowIndex];
          rowIndex += 1;
        }
      } else {
        while (rowIndex < rows.length - pagesAfterThis) {
          const nextHeight = heights[rowIndex];
          if (rowIndex > startIndex) {
            const currentDistance = Math.abs(targetHeight - used);
            const nextDistance = Math.abs(targetHeight - (used + nextHeight));
            if (used + nextHeight > capacity || nextDistance > currentDistance) break;
          }
          used += nextHeight;
          rowIndex += 1;
        }
      }
      pages.push(rows.slice(startIndex, rowIndex));
      pageHeights.push(used);
      remainingHeight -= used;
      remainingBalanceWeight -= balanceWeight;
    }
    const allPagesFit = pageHeights.every((height, index) => {
      const isLastPage = index === pageHeights.length - 1;
      const capacity = isLastPage
        ? SIGNATURE_PAGE_ROW_BUDGET_MM
        : STANDARD_PAGE_ROW_BUDGET_MM;
      return height <= capacity || pages[index].length === 1;
    });
    if (rowIndex === rows.length && allPagesFit) return pages;
    pageCount += 1;
  }
  return rows.map((row) => [row]);
}

function rosterRowMarkup(row: RosterRow, index: number): string {
  return `<tr>
            <td class="sequence" data-label="Sıra"><span class="cell-value">${index + 1}</span></td>
            <td class="student-number" data-label="Öğrenci no"><span class="cell-value">${escapeHtml(row.studentNumber)}</span></td>
            <td class="student-name" data-label="Adı soyadı"><span class="cell-value">${escapeHtml(row.fullName)}</span></td>
            <td class="identity" data-label="T.C. kimlik no"><span class="cell-value">${escapeHtml(row.nationalIdentityNumber)}</span></td>
            <td data-label="Veli / yakın"><div class="cell-value">${contactLines(row.contacts, "label")}</div></td>
            <td class="phone" data-label="Telefon"><div class="cell-value">${contactLines(row.contacts, "phone")}</div></td>
          </tr>`;
}

function buildHtml(options: {
  schoolName: string;
  teacherName: string;
  classroomName: string;
  academicYearLabel: string;
  generatedAt: string;
  generatedCivilDate: string;
  displayDate: string;
  rows: readonly RosterRow[];
}): { html: string; pageCount: number } {
  const pages = paginateRosterRows(options.rows);
  let rowOffset = 0;
  const pageMarkup = pages
    .map((pageRows, pageIndex) => {
      const isLastPage = pageIndex === pages.length - 1;
      const rowsMarkup = pageRows.length > 0
        ? pageRows
            .map((row, index) => rosterRowMarkup(row, rowOffset + index))
            .join("\n")
        : '<tr><td class="empty-roster" colspan="6">Bu sınıfta kayıtlı öğrenci bulunmuyor.</td></tr>';
      rowOffset += pageRows.length;
      return `<section class="roster-page${isLastPage ? " roster-page--last" : ""}" data-page-number="${pageIndex + 1}" data-page-count="${pages.length}" data-row-count="${pageRows.length}" aria-label="Sınıf listesi · sayfa ${pageIndex + 1} / ${pages.length}">
      <table aria-label="Öğrenci listesi · sayfa ${pageIndex + 1} / ${pages.length}">
        <colgroup>
          <col style="width: 5.5%">
          <col style="width: 9.5%">
          <col style="width: 22%">
          <col style="width: 16.5%">
          <col style="width: 26.5%">
          <col style="width: 20%">
        </colgroup>
        <thead>
          <tr class="document-heading-row">
            <th class="document-heading-cell" colspan="6">
              <div class="document-heading">
                <div>
                  <p class="institution">${escapeHtml(options.schoolName)}</p>
                  <h1>SINIF LİSTESİ</h1>
                </div>
                <div>
                  <p class="document-kind">Öğretmen çalışma belgesi</p>
                  <p class="student-count">${options.rows.length} öğrenci</p>
                </div>
              </div>
            </th>
          </tr>
          <tr class="document-meta-row">
            <th class="document-meta-cell" colspan="6">
              <div class="document-meta" aria-label="Belge bilgileri">
                <div class="meta-item"><span class="meta-label">Sınıf</span><span class="meta-value">${escapeHtml(options.classroomName)}</span></div>
                <div class="meta-item"><span class="meta-label">Eğitim yılı</span><span class="meta-value">${escapeHtml(options.academicYearLabel)}</span></div>
                <div class="meta-item"><span class="meta-label">Öğretmen</span><span class="meta-value">${escapeHtml(options.teacherName)}</span></div>
                <div class="meta-item"><span class="meta-label">Belge tarihi</span><span class="meta-value">${escapeHtml(options.displayDate)}</span></div>
              </div>
            </th>
          </tr>
          <tr class="column-head">
            <th scope="col">Sıra</th>
            <th scope="col">Öğrenci No</th>
            <th scope="col">Adı Soyadı</th>
            <th scope="col">T.C. Kimlik No</th>
            <th scope="col">Veli / Yakın</th>
            <th scope="col">Telefon</th>
          </tr>
        </thead>
        <tbody>
          ${rowsMarkup}
        </tbody>
      </table>
      <p class="screen-page-number" aria-hidden="true">Sayfa ${pageIndex + 1} / ${pages.length}</p>
      ${isLastPage
        ? `<footer class="document-footer">
        <section class="document-note" aria-label="Belge notları">
          <p class="production"><strong>Üretim tarihi:</strong> ${escapeHtml(options.displayDate)}</p>
          <p class="privacy-note">Bu belge kişisel veri içerir. Yalnız eğitim ve sınıf yönetimi amacıyla güvenli biçimde saklayınız.</p>
        </section>
        <section class="signature" aria-label="Öğretmen imza alanı">
          <strong class="signature-title">Sınıf öğretmeni</strong>
          <div class="signature-name">${escapeHtml(options.teacherName)}</div>
          <div class="signature-line" aria-hidden="true"></div>
          <div class="signature-label">İmza</div>
        </section>
      </footer>`
        : ""}
    </section>`;
    })
    .join("\n");

  const html = `${CLASS_ROSTER_HTML_FILE_SIGNATURE}
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="maarifos-generated-at" content="${escapeHtml(options.generatedAt)}">
  <meta name="maarifos-civil-date" content="${escapeHtml(options.generatedCivilDate)}">
  <meta name="maarifos-document-kind" content="${CLASS_ROSTER_DOCUMENT_KIND}">
  <meta name="maarifos-output-format" content="${CLASS_ROSTER_DOCUMENT_FORMAT}">
  <meta name="maarifos-row-count" content="${options.rows.length}">
  <meta name="maarifos-page-count" content="${pages.length}">
  <meta name="maarifos-contains-sensitive-data" content="true">
  <title>${escapeHtml(options.classroomName)} · Sınıf Listesi</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    @page {
      @bottom-left {
        content: "Kişisel veri içerir · ${escapeHtml(options.displayDate)}";
        color: #5c6b72;
        font: 7.5pt Arial, sans-serif;
      }
      @bottom-right {
        content: "Sayfa " counter(page) " / " counter(pages);
        color: #33464f;
        font: 700 7.5pt Arial, sans-serif;
      }
    }
    :root {
      color-scheme: only light;
      font-family: Aptos, Arial, "Helvetica Neue", sans-serif;
      color: #17324d;
      --ink: #17324d;
      --ink-soft: #415865;
      --teal: #176b5b;
      --teal-dark: #0d4f45;
      --teal-pale: #eaf3f0;
      --line: #a9b8b5;
      --line-soft: #d9e2e0;
      --paper-warm: #f8faf9;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; }
    body {
      font-size: 9pt;
      line-height: 1.3;
      font-variant-numeric: tabular-nums;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    main { width: 100%; margin: 0 auto; }
    .roster-page {
      width: 100%;
      break-after: page;
      page-break-after: always;
    }
    .roster-page--last {
      break-after: auto;
      page-break-after: auto;
    }
    .screen-page-number { display: none; }
    .screen-output-help {
      margin: 0 auto 4mm;
      padding: 3mm 4mm;
      border: .25mm solid #b8c7c3;
      background: #f7faf9;
      color: var(--ink-soft);
      font-size: 8pt;
      line-height: 1.45;
    }
    table {
      width: 100%;
      border: 0;
      border-collapse: separate;
      border-spacing: 0;
      table-layout: fixed;
    }
    thead { display: table-header-group; }
    tr { break-inside: avoid; page-break-inside: avoid; }
    th, td { overflow-wrap: break-word; word-break: normal; }
    .document-heading-cell {
      padding: 0 0 3.4mm;
      border: 0;
      background: #fff;
      text-align: left;
    }
    .document-heading {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 8mm;
      align-items: end;
      padding: 0 0 3mm 4mm;
      border-bottom: .75mm solid var(--teal);
      border-left: 2.2mm solid var(--teal);
    }
    .institution {
      margin: 0 0 1.2mm;
      color: var(--ink-soft);
      font-size: 8.5pt;
      font-weight: 700;
      letter-spacing: .015em;
    }
    h1 {
      margin: 0;
      color: var(--ink);
      font-size: 18pt;
      line-height: 1.05;
      letter-spacing: .055em;
    }
    .document-kind {
      margin: 0 0 .4mm;
      color: var(--teal-dark);
      font-size: 7.5pt;
      font-weight: 700;
      letter-spacing: .09em;
      text-align: right;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .student-count {
      margin: 0;
      color: var(--ink-soft);
      font-size: 8pt;
      text-align: right;
    }
    .document-meta-cell {
      padding: 0 0 3mm;
      border: 0;
      background: #fff;
    }
    .document-meta {
      display: grid;
      grid-template-columns: 1.25fr 1fr;
      gap: 1.4mm 8mm;
      padding: 2.7mm 3.2mm;
      border: .25mm solid #bfd0cb;
      background: var(--teal-pale);
      text-align: left;
    }
    .meta-item { min-width: 0; }
    .meta-label {
      display: inline;
      margin-right: 1.2mm;
      color: var(--teal-dark);
      font-size: 7pt;
      font-weight: 700;
      letter-spacing: .045em;
      text-transform: uppercase;
    }
    .meta-value {
      color: var(--ink);
      font-size: 8.5pt;
      font-weight: 600;
    }
    .column-head th {
      padding: 2.2mm 1.5mm;
      border-top: .35mm solid var(--teal-dark);
      border-right: .2mm solid #91aaa4;
      border-bottom: .35mm solid var(--teal-dark);
      background: #dcebe7;
      color: #143b35;
      font-size: 7.7pt;
      font-weight: 700;
      line-height: 1.15;
      text-align: left;
      vertical-align: middle;
    }
    .column-head th:first-child { border-left: .35mm solid var(--teal-dark); }
    .column-head th:last-child { border-right: .35mm solid var(--teal-dark); }
    tbody td {
      padding: 1.8mm 1.5mm;
      border-right: .2mm solid var(--line-soft);
      border-bottom: .2mm solid var(--line);
      background: #fff;
      color: var(--ink);
      font-size: 8.4pt;
      line-height: 1.28;
      vertical-align: middle;
    }
    tbody tr:nth-child(even) td { background: var(--paper-warm); }
    tbody td:first-child { border-left: .2mm solid var(--line); }
    tbody td:last-child { border-right: .2mm solid var(--line); }
    .sequence, .student-number { text-align: center; }
    .cell-value { min-width: 0; }
    .student-name { font-weight: 700; }
    .identity { white-space: nowrap; }
    .phone { font-size: 8.1pt; }
    .contact-line + .contact-line {
      margin-top: 1mm;
      padding-top: 1mm;
      border-top: .2mm dotted #b9c6c3;
    }
    .empty-value { color: #738087; }
    .empty-roster {
      padding: 12mm 6mm;
      color: #596965;
      text-align: center;
    }
    .document-footer {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 58mm;
      gap: 12mm;
      align-items: end;
      margin-top: 4mm;
      padding-top: 2mm;
      border-top: .25mm solid var(--line-soft);
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .document-note { align-self: end; color: var(--ink-soft); }
    .document-note p { margin: 0; }
    .document-note p + p { margin-top: 1.5mm; }
    .privacy-note { font-size: 7pt; }
    .production { font-size: 8pt; }
    .signature {
      min-height: 20mm;
      padding: 2mm 3mm 1.5mm;
      border: .25mm solid #b8c7c3;
      background: #fbfcfc;
      text-align: center;
    }
    .signature-title {
      display: block;
      color: var(--teal-dark);
      font-size: 7pt;
      letter-spacing: .055em;
      text-transform: uppercase;
    }
    .signature-name {
      min-height: 4mm;
      margin-top: 1mm;
      color: var(--ink);
      font-size: 8.5pt;
      font-weight: 700;
    }
    .signature-line {
      width: 42mm;
      margin: 3.5mm auto 0;
      border-bottom: .3mm solid var(--ink);
    }
    .signature-label { margin-top: 1.2mm; color: #66757b; font-size: 7pt; }
    @media screen and (min-width: 701px) {
      body { padding: 10mm; background: #e9eeec; }
      main { width: 210mm; }
      .screen-output-help { width: 210mm; }
      .roster-page {
        min-height: 297mm;
        margin: 0 auto 10mm;
        padding: 12mm;
        background: #fff;
        box-shadow: 0 2mm 14mm rgb(20 45 38 / .16);
      }
      .screen-page-number {
        display: block;
        margin: 5mm 0 0;
        color: var(--ink-soft);
        font-size: 8pt;
        text-align: right;
      }
    }
    @media screen and (max-width: 700px) {
      html, body { width: 100%; max-width: 100%; overflow-x: hidden; }
      body { min-width: 0; background: #eef2f1; font-size: 14px; }
      main { width: 100%; max-width: 100%; }
      .screen-output-help {
        margin: 0;
        padding: 12px 16px;
        border-width: 0 0 1px;
        font-size: 12px;
      }
      .roster-page {
        padding: 16px;
        background: #eef2f1;
        break-after: auto;
        page-break-after: auto;
      }
      .roster-page + .roster-page { padding-top: 0; }
      .roster-page + .roster-page .document-heading-row,
      .roster-page + .roster-page .document-meta-row { display: none; }
      table, thead, tbody, tr, th, td { display: block; width: 100%; }
      colgroup, .column-head { display: none; }
      .document-heading-cell, .document-meta-cell { padding-bottom: 12px; }
      .document-heading {
        grid-template-columns: 1fr;
        gap: 10px;
        padding: 0 0 14px 14px;
        border-bottom-width: 2px;
        border-left-width: 6px;
      }
      .institution { margin-bottom: 6px; font-size: 12px; line-height: 1.35; }
      h1 { font-size: 24px; letter-spacing: .035em; }
      .document-kind, .student-count { font-size: 11px; text-align: left; }
      .document-meta {
        grid-template-columns: 1fr;
        gap: 8px;
        padding: 12px 14px;
        border-radius: 10px;
      }
      .meta-item { display: grid; grid-template-columns: 88px minmax(0, 1fr); gap: 8px; }
      .meta-label { margin: 0; font-size: 10px; }
      .meta-value { font-size: 13px; line-height: 1.35; }
      tbody tr {
        display: grid;
        gap: 0;
        margin: 0 0 12px;
        overflow: hidden;
        border: 1px solid #c4d1ce;
        border-radius: 12px;
        background: #fff;
        box-shadow: 0 2px 8px rgb(20 45 38 / .06);
      }
      tbody td,
      tbody tr:nth-child(even) td {
        display: grid;
        grid-template-columns: 96px minmax(0, 1fr);
        gap: 10px;
        min-width: 0;
        padding: 9px 12px;
        border: 0;
        border-bottom: 1px solid #e1e8e6;
        background: #fff;
        font-size: 13px;
        line-height: 1.4;
        text-align: left;
        white-space: normal;
        overflow-wrap: anywhere;
      }
      tbody td:last-child { border-bottom: 0; }
      tbody td::before {
        content: attr(data-label);
        color: var(--teal-dark);
        font-size: 10px;
        font-weight: 700;
        letter-spacing: .035em;
        text-transform: uppercase;
      }
      .student-name { font-size: 14px; }
      .contact-line + .contact-line { margin-top: 7px; padding-top: 7px; }
      .empty-roster { display: block; padding: 28px 16px; text-align: center; }
      .empty-roster::before { content: none; }
      .document-footer {
        grid-template-columns: 1fr;
        gap: 16px;
        margin-top: 20px;
        padding-top: 16px;
      }
      .document-note { font-size: 12px; line-height: 1.45; }
      .signature { min-height: 126px; padding: 16px; }
      .signature-title { font-size: 10px; }
      .signature-name { margin-top: 8px; font-size: 13px; }
      .signature-line { width: min(180px, 75%); margin-top: 28px; }
    }
    @media print {
      html, body { width: auto; min-height: auto; }
      .screen-output-help { display: none; }
      .roster-page { width: 100%; }
    }
  </style>
</head>
<body>
  <p class="screen-output-help" role="note">Bu dosya yerel A4 HTML önizlemesidir; PDF dosyası değildir. Açtıktan sonra tarayıcınızın yazdırma ekranını kullanabilirsiniz. PDF olarak kaydetme ve paylaşma seçenekleri cihaza göre değişir.</p>
  <main aria-label="Sınıf listesi belgesi">
    ${pageMarkup}
  </main>
</body>
</html>`;
  return { html, pageCount: pages.length };
}

interface ResolvedClassRosterDocumentInput {
  readonly schoolName: string;
  readonly teacherName: string;
  readonly classroomName: string;
  readonly academicYearLabel: string;
  readonly generatedAt: string;
  readonly generatedCivilDate: string;
  readonly displayDate: string;
  readonly rows: readonly RosterRow[];
  readonly scope: ActiveClassroomScope;
}

function resolveClassRosterDocumentInput(
  input: ClassRosterDocumentInput,
): ResolvedClassRosterDocumentInput {
  const schoolName = requireText(input.schoolName, "Okul adı");
  const teacherName = requireText(input.teacherName, "Öğretmen adı soyadı");
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

  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const { civilDate: generatedCivilDate, displayDate } =
    generatedDateParts(generatedAt);
  return {
    schoolName,
    teacherName,
    classroomName,
    academicYearLabel,
    generatedAt,
    generatedCivilDate,
    displayDate,
    rows: rosterRows(input.snapshot.students, input.scope),
    scope: { ...input.scope },
  };
}

/**
 * Aktif sınıf kapsamını snapshot üzerinde tekrar doğrular ve yalnız o sınıfın
 * etkin öğrencilerini A4 baskıya hazır, dış kaynaksız bir HTML dosyasına çevirir.
 */
export function createClassRosterDocument(
  input: ClassRosterDocumentInput,
): ClassRosterDocumentFile {
  const resolved = resolveClassRosterDocumentInput(input);
  const { html, pageCount } = buildHtml({
    ...resolved,
  });
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

const PDF_PAGE_MARGIN = 54;
const PDF_TABLE_TOP = 340;
const PDF_STANDARD_BODY_BOTTOM = 1650;
const PDF_LAST_BODY_BOTTOM = 1490;
const PDF_ROW_LINE_HEIGHT = 23;
const PDF_COLUMN_WIDTHS = [54, 100, 230, 170, 310, 268] as const;

interface PdfRosterRowLayout {
  readonly row: RosterRow;
  readonly cells: readonly (readonly string[])[];
  readonly height: number;
}

function splitLongCanvasWord(
  context: CanvasRenderingContext2D,
  word: string,
  maxWidth: number,
): string[] {
  if (context.measureText(word).width <= maxWidth) return [word];
  const pieces: string[] = [];
  let piece = "";
  for (const character of word) {
    const candidate = piece + character;
    if (piece && context.measureText(candidate).width > maxWidth) {
      pieces.push(piece);
      piece = character;
    } else {
      piece = candidate;
    }
  }
  if (piece) pieces.push(piece);
  return pieces.length > 0 ? pieces : [word];
}

function wrapCanvasText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  for (const explicitLine of text.split("\n")) {
    const words = explicitLine
      .split(/\s+/u)
      .filter(Boolean)
      .flatMap((word) => splitLongCanvasWord(context, word, maxWidth));
    if (words.length === 0) {
      lines.push("—");
      continue;
    }
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && context.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
  }
  return lines.length > 0 ? lines : ["—"];
}

function pdfRosterRowLayout(
  context: CanvasRenderingContext2D,
  row: RosterRow,
  sequence: number,
): PdfRosterRowLayout {
  const contactLabels = row.contacts.length > 0
    ? row.contacts.map((contact) => contact.label).join("\n")
    : "—";
  const contactPhones = row.contacts.length > 0
    ? row.contacts.map((contact) => contact.phone).join("\n")
    : "—";
  const values = [
    String(sequence),
    row.studentNumber,
    row.fullName,
    row.nationalIdentityNumber,
    contactLabels,
    contactPhones,
  ];
  const cells = values.map((value, index) => {
    context.font = index === 2
      ? '700 17px Arial, "Helvetica Neue", sans-serif'
      : '400 17px Arial, "Helvetica Neue", sans-serif';
    return wrapCanvasText(context, value, PDF_COLUMN_WIDTHS[index]! - 18);
  });
  const lineCount = Math.max(...cells.map((lines) => lines.length));
  return {
    row,
    cells,
    height: Math.max(52, lineCount * PDF_ROW_LINE_HEIGHT + 22),
  };
}

function layoutHeight(layouts: readonly PdfRosterRowLayout[]): number {
  return layouts.reduce((total, layout) => total + layout.height, 0);
}

function paginatePdfRosterRows(
  layouts: readonly PdfRosterRowLayout[],
): PdfRosterRowLayout[][] {
  if (layouts.length === 0) return [[]];
  const standardCapacity = PDF_STANDARD_BODY_BOTTOM - PDF_TABLE_TOP;
  const lastCapacity = PDF_LAST_BODY_BOTTOM - PDF_TABLE_TOP;
  const pages: PdfRosterRowLayout[][] = [];
  let page: PdfRosterRowLayout[] = [];
  let used = 0;
  for (const layout of layouts) {
    if (page.length > 0 && used + layout.height > standardCapacity) {
      pages.push(page);
      page = [];
      used = 0;
    }
    page.push(layout);
    used += layout.height;
  }
  pages.push(page);

  while (true) {
    const last = pages.at(-1)!;
    if (layoutHeight(last) <= lastCapacity || last.length <= 1) break;
    let splitAt = last.length - 1;
    while (splitAt > 0) {
      const previousPage = last.slice(0, splitAt);
      const nextLastPage = last.slice(splitAt);
      if (
        layoutHeight(previousPage) <= standardCapacity &&
        layoutHeight(nextLastPage) <= lastCapacity
      ) {
        pages[pages.length - 1] = previousPage;
        pages.push(nextLastPage);
        break;
      }
      splitAt -= 1;
    }
    if (splitAt === 0) {
      const trailing = last.pop();
      if (!trailing) break;
      pages.push([trailing]);
    }
  }
  return pages;
}

function drawCanvasLines(
  context: CanvasRenderingContext2D,
  lines: readonly string[],
  x: number,
  y: number,
  lineHeight: number,
): void {
  lines.forEach((line, index) => {
    context.fillText(line, x, y + index * lineHeight);
  });
}

function drawClassRosterPdfPage(
  context: CanvasRenderingContext2D,
  resolved: ResolvedClassRosterDocumentInput,
  pageRows: readonly PdfRosterRowLayout[],
  pageIndex: number,
  pageCount: number,
  isLastPage: boolean,
): void {
  const contentWidth = A4_PDF_CANVAS_WIDTH - PDF_PAGE_MARGIN * 2;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, A4_PDF_CANVAS_WIDTH, A4_PDF_CANVAS_HEIGHT);
  context.fillStyle = "#176b5b";
  context.fillRect(0, 0, A4_PDF_CANVAS_WIDTH, 22);
  context.textAlign = "left";
  context.textBaseline = "alphabetic";

  context.fillStyle = "#415865";
  context.font = '700 18px Arial, "Helvetica Neue", sans-serif';
  const schoolLines = wrapCanvasText(context, resolved.schoolName, 760).slice(0, 2);
  drawCanvasLines(context, schoolLines, PDF_PAGE_MARGIN, 68, 22);
  context.fillStyle = "#17324d";
  context.font = '700 34px Arial, "Helvetica Neue", sans-serif';
  context.fillText("SINIF LİSTESİ", PDF_PAGE_MARGIN, 132);
  context.fillStyle = "#176b5b";
  context.font = '700 16px Arial, "Helvetica Neue", sans-serif';
  context.textAlign = "right";
  context.fillText(`${resolved.rows.length} öğrenci`, A4_PDF_CANVAS_WIDTH - PDF_PAGE_MARGIN, 96);
  context.fillStyle = "#415865";
  context.font = '600 15px Arial, "Helvetica Neue", sans-serif';
  context.fillText(`Sayfa ${pageIndex + 1} / ${pageCount}`, A4_PDF_CANVAS_WIDTH - PDF_PAGE_MARGIN, 126);
  context.textAlign = "left";
  context.fillStyle = "#176b5b";
  context.fillRect(PDF_PAGE_MARGIN, 150, contentWidth, 4);

  const meta = [
    ["Sınıf", resolved.classroomName],
    ["Eğitim yılı", resolved.academicYearLabel],
    ["Öğretmen", resolved.teacherName],
    ["Belge tarihi", resolved.displayDate],
  ] as const;
  const metaTop = 170;
  const metaWidth = contentWidth / 2;
  const metaHeight = 58;
  meta.forEach(([label, value], index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = PDF_PAGE_MARGIN + column * metaWidth;
    const y = metaTop + row * metaHeight;
    context.fillStyle = "#f4f8f7";
    context.fillRect(x, y, metaWidth, metaHeight);
    context.strokeStyle = "#a9b8b5";
    context.lineWidth = 1;
    context.strokeRect(x, y, metaWidth, metaHeight);
    context.fillStyle = "#176b5b";
    context.font = '700 13px Arial, "Helvetica Neue", sans-serif';
    context.fillText(label.toLocaleUpperCase("tr-TR"), x + 12, y + 19);
    context.fillStyle = "#17324d";
    context.font = '600 17px Arial, "Helvetica Neue", sans-serif';
    const valueLines = wrapCanvasText(context, value, metaWidth - 24).slice(0, 2);
    drawCanvasLines(context, valueLines, x + 12, y + 42, 18);
  });

  const headings = [
    "Sıra",
    "Öğrenci No",
    "Adı Soyadı",
    "T.C. Kimlik No",
    "Veli / Yakın",
    "Telefon",
  ];
  let x = PDF_PAGE_MARGIN;
  const tableHeaderTop = PDF_TABLE_TOP - 48;
  headings.forEach((heading, index) => {
    const width = PDF_COLUMN_WIDTHS[index]!;
    context.fillStyle = "#176b5b";
    context.fillRect(x, tableHeaderTop, width, 48);
    context.strokeStyle = "#ffffff";
    context.strokeRect(x, tableHeaderTop, width, 48);
    context.fillStyle = "#ffffff";
    context.font = '700 15px Arial, "Helvetica Neue", sans-serif';
    const lines = wrapCanvasText(context, heading, width - 14).slice(0, 2);
    drawCanvasLines(context, lines, x + 7, tableHeaderTop + 21, 17);
    x += width;
  });

  let y = PDF_TABLE_TOP;
  if (pageRows.length === 0) {
    context.fillStyle = "#f8faf9";
    context.fillRect(PDF_PAGE_MARGIN, y, contentWidth, 76);
    context.strokeStyle = "#a9b8b5";
    context.strokeRect(PDF_PAGE_MARGIN, y, contentWidth, 76);
    context.fillStyle = "#415865";
    context.font = '400 19px Arial, "Helvetica Neue", sans-serif';
    context.textAlign = "center";
    context.fillText(
      "Bu sınıfta kayıtlı öğrenci bulunmuyor.",
      A4_PDF_CANVAS_WIDTH / 2,
      y + 45,
    );
    context.textAlign = "left";
    y += 76;
  } else {
    pageRows.forEach((layout, pageRowIndex) => {
      let cellX = PDF_PAGE_MARGIN;
      layout.cells.forEach((lines, columnIndex) => {
        const width = PDF_COLUMN_WIDTHS[columnIndex]!;
        context.fillStyle = pageRowIndex % 2 === 0 ? "#ffffff" : "#f8faf9";
        context.fillRect(cellX, y, width, layout.height);
        context.strokeStyle = "#a9b8b5";
        context.lineWidth = 1;
        context.strokeRect(cellX, y, width, layout.height);
        context.fillStyle = "#17324d";
        context.font = columnIndex === 2
          ? '700 17px Arial, "Helvetica Neue", sans-serif'
          : '400 17px Arial, "Helvetica Neue", sans-serif';
        drawCanvasLines(context, lines, cellX + 9, y + 26, PDF_ROW_LINE_HEIGHT);
        cellX += width;
      });
      y += layout.height;
    });
  }

  if (isLastPage) {
    const footerTop = Math.max(y + 28, 1510);
    context.strokeStyle = "#176b5b";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(PDF_PAGE_MARGIN, footerTop);
    context.lineTo(A4_PDF_CANVAS_WIDTH - PDF_PAGE_MARGIN, footerTop);
    context.stroke();
    context.fillStyle = "#415865";
    context.font = '400 14px Arial, "Helvetica Neue", sans-serif';
    const privacyLines = wrapCanvasText(
      context,
      "Bu belge kişisel veri içerir. Yalnız eğitim ve sınıf yönetimi amacıyla güvenli biçimde saklayınız.",
      640,
    );
    drawCanvasLines(context, privacyLines, PDF_PAGE_MARGIN, footerTop + 30, 19);
    context.fillStyle = "#17324d";
    context.font = '700 16px Arial, "Helvetica Neue", sans-serif';
    context.fillText("Sınıf öğretmeni", 860, footerTop + 30);
    context.font = '600 16px Arial, "Helvetica Neue", sans-serif';
    context.fillText(resolved.teacherName, 860, footerTop + 57);
    context.strokeStyle = "#415865";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(860, footerTop + 102);
    context.lineTo(1168, footerTop + 102);
    context.stroke();
    context.fillStyle = "#415865";
    context.font = '400 13px Arial, "Helvetica Neue", sans-serif';
    context.fillText("İmza", 860, footerTop + 123);
  }

  context.fillStyle = "#5c6b72";
  context.font = '400 13px Arial, "Helvetica Neue", sans-serif';
  context.textAlign = "center";
  context.fillText(
    `MaarifOS · ${resolved.generatedCivilDate} · ${pageIndex + 1}/${pageCount}`,
    A4_PDF_CANVAS_WIDTH / 2,
    A4_PDF_CANVAS_HEIGHT - 26,
  );
  context.textAlign = "left";
}

/**
 * Aynı doğrulanmış snapshot'tan HTML önizleme ve etiketli, seçilebilir metinli
 * gerçek A4 PDF baytlarını birlikte üretir. Öğrenci/veli verisi yalnız görünür
 * belge gövdesinde kalır; PDF üstverisine taşınmaz.
 */
export async function createClassRosterPdfDocument(
  input: ClassRosterDocumentInput,
  options: { readonly runtime?: ClassRosterPdfRuntime } = {},
): Promise<ClassRosterPdfDocumentFile> {
  const resolved = resolveClassRosterDocumentInput(input);
  const { html } = buildHtml({ ...resolved });
  const tableRows = resolved.rows.map((row, index) => [
    String(index + 1),
    row.studentNumber,
    row.fullName,
    row.nationalIdentityNumber,
    row.contacts.length > 0
      ? row.contacts.map((contact) => contact.label).join("\n")
      : "—",
    row.contacts.length > 0
      ? row.contacts.map((contact) => contact.phone).join("\n")
      : "—",
  ] as const);
  const nodes: SemanticPdfNode[] = [
    { kind: "heading", level: 1, text: "SINIF LİSTESİ" },
    {
      kind: "paragraph",
      tone: "meta",
      text: `Okul: ${resolved.schoolName} · ${resolved.rows.length} öğrenci`,
    },
    {
      kind: "table",
      summary: "Sınıf, eğitim yılı, öğretmen ve belge tarihi bilgileri",
      headers: ["Belge alanı", "Değer"],
      columnWeights: [1, 3],
      rowHeaderColumn: 0,
      rows: [
        ["Sınıf", resolved.classroomName],
        ["Eğitim yılı", resolved.academicYearLabel],
        ["Öğretmen", resolved.teacherName],
        ["Belge tarihi", resolved.displayDate],
      ],
    },
    ...(resolved.rows.length === 0
      ? [{ kind: "paragraph" as const, text: "Bu sınıfta kayıtlı öğrenci bulunmuyor." }]
      : []),
    {
      kind: "table",
      summary: "Aktif sınıf öğrencileri ve veli iletişim bilgileri",
      headers: [
        "Sıra",
        "Öğrenci No",
        "Adı Soyadı",
        "T.C. Kimlik No",
        "Veli / Yakın",
        "Telefon",
      ],
      columnWeights: [0.55, 0.9, 2.8, 1.35, 2.4, 1.8],
      rowHeaderColumn: 2,
      continuationContextColumns: [0, 1, 2, 3],
      rows: tableRows,
    },
    { kind: "heading", level: 2, text: "Kişisel veri ve imza" },
    {
      kind: "paragraph",
      text: "Bu belge kişisel veri içerir. Yalnız eğitim ve sınıf yönetimi amacıyla güvenli biçimde saklayınız.",
    },
    { kind: "paragraph", text: `Sınıf öğretmeni: ${resolved.teacherName}` },
    { kind: "paragraph", tone: "meta", text: "İmza: ______________________________" },
  ];
  const bytes = await createSemanticTaggedPdf(
    {
      title: "MaarifOS Sınıf Listesi",
      language: "tr-TR",
      creator: "MaarifOS",
      artifactFooterText: "Kişisel veri içerir · Yetkisiz paylaşmayınız.",
      nodes,
    },
    options.runtime,
  );
  const pageCount = semanticTaggedPdfPageCount(bytes);
  const baseName = `MaarifOS_Sinif_Listesi_${safeFileSegment(resolved.classroomName)}_${safeFileSegment(resolved.academicYearLabel)}`;
  return {
    documentKind: CLASS_ROSTER_DOCUMENT_KIND,
    format: CLASS_ROSTER_PDF_FORMAT,
    fileName: `${baseName}.pdf`,
    mimeType: CLASS_ROSTER_PDF_MIME_TYPE,
    bytes,
    html,
    htmlFileName: `${baseName}.html`,
    rowCount: resolved.rows.length,
    pageCount,
    containsSensitiveData: true,
    capabilities: CLASS_ROSTER_PDF_CAPABILITIES,
    generatedAt: resolved.generatedAt,
    generatedCivilDate: resolved.generatedCivilDate,
    scope: resolved.scope,
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
      kind: "local-html",
      title: file.htmlFileName.replace(/\.html$/u, ""),
      html: file.html,
      mimeType: CLASS_ROSTER_DOCUMENT_MIME_TYPE,
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
