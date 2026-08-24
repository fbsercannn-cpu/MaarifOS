import type { ActiveClassroomScope } from "../../core/domain/classroom-scope.ts";
import type { DataSnapshot, StoredRecord } from "../../core/domain/model.ts";

export const CLASS_ROSTER_DOCUMENT_FORMAT = "html" as const;
export const CLASS_ROSTER_DOCUMENT_MIME_TYPE = "text/html;charset=utf-8" as const;
export const CLASS_ROSTER_HTML_FILE_SIGNATURE = "<!doctype html>" as const;

export interface ClassRosterDocumentInput {
  readonly scope: ActiveClassroomScope;
  readonly snapshot: Pick<DataSnapshot, "academicYears" | "classrooms" | "students">;
  readonly schoolName: string;
  readonly teacherName: string;
  /** UTC ISO-8601. Varsayılan, üretim anıdır. */
  readonly generatedAt?: string;
}

export interface ClassRosterDocumentFile {
  readonly format: typeof CLASS_ROSTER_DOCUMENT_FORMAT;
  readonly fileName: string;
  readonly mimeType: typeof CLASS_ROSTER_DOCUMENT_MIME_TYPE;
  readonly bytes: Uint8Array;
  readonly html: string;
  readonly rowCount: number;
  readonly generatedAt: string;
  readonly generatedCivilDate: string;
  readonly scope: ActiveClassroomScope;
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
  const nameLines = estimatedWrappedLines(row.fullName, 24);
  const contactLabelLines = row.contacts.length === 0
    ? 1
    : row.contacts.reduce(
        (sum, contact) => sum + estimatedWrappedLines(contact.label, 30),
        0,
      );
  const contactPhoneLines = row.contacts.length === 0
    ? 1
    : row.contacts.reduce(
        (sum, contact) => sum + estimatedWrappedLines(contact.phone, 23),
        0,
      );
  const separatorAllowance = Math.max(0, row.contacts.length - 1) * 1.8;
  const contentLines = Math.max(nameLines, contactLabelLines, contactPhoneLines);
  return 4.2 + contentLines * 3.35 + separatorAllowance;
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

  const pages: RosterRow[][] = [];
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
    pages.push(rows.slice(startIndex, rowIndex));
    remainingHeight -= used;
    remainingBalanceWeight -= balanceWeight;
  }
  return pages;
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
}): string {
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
      return `<section class="roster-page${isLastPage ? " roster-page--last" : ""}" aria-label="Sınıf listesi · sayfa ${pageIndex + 1} / ${pages.length}">
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

  return `${CLASS_ROSTER_HTML_FILE_SIGNATURE}
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="maarifos-generated-at" content="${escapeHtml(options.generatedAt)}">
  <meta name="maarifos-civil-date" content="${escapeHtml(options.generatedCivilDate)}">
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
      .roster-page { width: 100%; }
    }
  </style>
</head>
<body>
  <main aria-label="Sınıf listesi belgesi">
    ${pageMarkup}
  </main>
</body>
</html>`;
}

/**
 * Aktif sınıf kapsamını snapshot üzerinde tekrar doğrular ve yalnız o sınıfın
 * etkin öğrencilerini A4 baskıya hazır, dış kaynaksız bir HTML dosyasına çevirir.
 */
export function createClassRosterDocument(
  input: ClassRosterDocumentInput,
): ClassRosterDocumentFile {
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
  const rows = rosterRows(input.snapshot.students, input.scope);
  const html = buildHtml({
    schoolName,
    teacherName,
    classroomName,
    academicYearLabel,
    generatedAt,
    generatedCivilDate,
    displayDate,
    rows,
  });
  return {
    format: CLASS_ROSTER_DOCUMENT_FORMAT,
    fileName: `MaarifOS_Sinif_Listesi_${safeFileSegment(classroomName)}_${safeFileSegment(academicYearLabel)}.html`,
    mimeType: CLASS_ROSTER_DOCUMENT_MIME_TYPE,
    bytes: encoder.encode(html),
    html,
    rowCount: rows.length,
    generatedAt,
    generatedCivilDate,
    scope: { ...input.scope },
  };
}

/** UI indirme yardımcılarının doğrudan kullanabileceği yerel Blob sözleşmesi. */
export function classRosterDocumentBlob(file: ClassRosterDocumentFile): Blob {
  const bytes = new Uint8Array(file.bytes.byteLength);
  bytes.set(file.bytes);
  return new Blob([bytes.buffer], { type: file.mimeType });
}
