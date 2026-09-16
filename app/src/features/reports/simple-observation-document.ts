import type { ActiveClassroomScope } from "../../core/domain/classroom-scope.ts";
import type { DataSnapshot, StoredRecord } from "../../core/domain/model.ts";
import { studentMembershipOverlaps, resolveStudentMembershipOn } from "../../core/domain/student-membership.ts";
import { createSemanticTaggedPdf, type SemanticPdfNode, type SemanticTaggedPdfRuntime } from "../documents/semantic-tagged-pdf.ts";
import { registerPdfPreviewRecipe, validatePdfSelection, type PdfPreviewRecipe } from "../documents/pdf-preview-model.ts";
import { TEACHER_DOCUMENT_THEME, TEACHER_PRINT_THEME } from "../documents/document-theme.ts";

export const SIMPLE_OBSERVATION_DOCUMENT_FORMAT = "html" as const;
export const SIMPLE_OBSERVATION_DOCUMENT_MIME_TYPE =
  "text/html;charset=utf-8" as const;
export const SIMPLE_OBSERVATION_HTML_FILE_SIGNATURE = "<!doctype html>" as const;

export type SimpleObservationDocumentAudience = "parent" | "administration";

export interface SimpleObservationPeriod {
  readonly startCivilDate: string;
  readonly endCivilDate: string;
  readonly label?: string | null;
}

export interface SimpleObservationTeacherSections {
  /** Yalnız öğretmenin kendi kayıt metni; sistem bu alanı türetmez. */
  readonly strengths?: string | null;
  /** Yalnız öğretmenin kendi kayıt metni; tanı veya gelişim hükmü üretilmez. */
  readonly supportAreas?: string | null;
  /** Yalnız öğretmenin aile için kendi yazdığı öneri; sistem öneri uydurmaz. */
  readonly homeSuggestions?: string | null;
}

export interface SimpleObservationDocumentInput {
  readonly audience: SimpleObservationDocumentAudience;
  readonly scope: ActiveClassroomScope;
  readonly snapshot: Pick<
    DataSnapshot,
    "academicYears" | "classrooms" | "students" | "observations"
  >;
  readonly studentId: string;
  readonly schoolName: string;
  readonly teacherName: string;
  readonly classroomName: string;
  readonly academicYearName: string;
  readonly period: SimpleObservationPeriod;
  readonly teacherSections?: SimpleObservationTeacherSections;
  /** UTC ISO-8601. Varsayılan, üretim anıdır. */
  readonly generatedAt?: string;
}

export interface SimpleObservationDocumentFile {
  readonly format: typeof SIMPLE_OBSERVATION_DOCUMENT_FORMAT;
  readonly audience: SimpleObservationDocumentAudience;
  readonly fileName: string;
  readonly mimeType: typeof SIMPLE_OBSERVATION_DOCUMENT_MIME_TYPE;
  readonly bytes: Uint8Array;
  readonly html: string;
  readonly observationCount: number;
  readonly generatedAt: string;
  readonly generatedCivilDate: string;
  readonly period: SimpleObservationPeriod;
}

interface ObservationExcerpt {
  readonly civilDate: string;
  readonly displayDate: string;
  readonly context: string | null;
  readonly rawText: string;
  readonly childQuote: string | null;
}

const TURKISH_TIME_ZONE = "Europe/Istanbul" as const;
const CIVIL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const UUID_PATTERN =
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/iu;
const NATIONAL_IDENTITY_PATTERN = /(^|\D)[1-9]\d{10}(?!\d)/u;
const TURKISH_MOBILE_PATTERN =
  /(?:\+?90[\s().-]*)?0?5(?:[\s().-]*\d){9}(?!\d)/u;
const encoder = new TextEncoder();

function nonEmptyText(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function requireText(value: string, label: string): string {
  const normalized = nonEmptyText(value);
  if (!normalized) throw new Error(`${label} boş bırakılamaz.`);
  return normalized;
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
      .normalize("NFKC")
      .replace(/[\u0000-\u001f\u007f]/gu, "-")
      .replace(/[\\/:*?"<>|]/gu, "-")
      .replace(/\.{2,}/gu, "-")
      .replace(/^[.\s]+|[.\s]+$/gu, "")
      .replace(/\s+/gu, "_")
      .replace(/-{2,}/gu, "-")
      .slice(0, 64) || "Cocuk"
  );
}

function isCivilDate(value: string): boolean {
  if (!CIVIL_DATE_PATTERN.test(value)) return false;
  const instant = new Date(`${value}T12:00:00.000Z`);
  return (
    !Number.isNaN(instant.getTime()) &&
    instant.toISOString().slice(0, 10) === value
  );
}

function requireCivilDate(value: string, label: string): string {
  if (!isCivilDate(value)) {
    throw new Error(`${label} geçerli bir YYYY-AA-GG tarihi olmalıdır.`);
  }
  return value;
}

function displayCivilDate(civilDate: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: TURKISH_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${civilDate}T12:00:00.000Z`));
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
  return { civilDate, displayDate: displayCivilDate(civilDate) };
}

function isLiveRecord(record: StoredRecord): boolean {
  return typeof record.deletedAt !== "string";
}

function studentIsActiveInScope(
  student: StoredRecord,
  scope: ActiveClassroomScope,
  academicYear?: StoredRecord,
  period?: SimpleObservationPeriod,
): boolean {
  if (academicYear && period && isCivilDate(String(academicYear.startDate)) && isCivilDate(String(academicYear.endDate))) {
    return studentMembershipOverlaps(student, { ...scope, academicYear, periodStart: period.startCivilDate, periodEnd: period.endCivilDate });
  }
  if (
    !isLiveRecord(student) ||
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
      enrollment.status === "active" &&
      enrollment.endedOn === undefined
    );
  });
}

function observationStudentIds(observation: StoredRecord): string[] {
  if (Array.isArray(observation.studentIds)) {
    return observation.studentIds.filter(
      (candidate): candidate is string =>
        typeof candidate === "string" && candidate.length > 0,
    );
  }
  return typeof observation.studentId === "string" && observation.studentId
    ? [observation.studentId]
    : [];
}

function observationsForStudent(
  observations: readonly StoredRecord[],
  scope: ActiveClassroomScope,
  studentId: string,
  period: SimpleObservationPeriod,
  isMemberOn?: (date: string) => boolean,
): ObservationExcerpt[] {
  return observations
    .map((record, sourceIndex) => ({ record, sourceIndex }))
    .filter(({ record }) => {
      const studentIds = observationStudentIds(record);
      return (
        isLiveRecord(record) &&
        record.academicYearId === scope.academicYearId &&
        record.classroomId === scope.classroomId &&
        studentIds.length === 1 &&
        studentIds[0] === studentId &&
        typeof record.civilDate === "string" &&
        isCivilDate(record.civilDate) &&
        record.civilDate >= period.startCivilDate &&
        record.civilDate <= period.endCivilDate &&
        (!isMemberOn || isMemberOn(record.civilDate)) &&
        nonEmptyText(record.rawText) !== null
      );
    })
    .sort(
      (left, right) =>
        String(left.record.civilDate).localeCompare(String(right.record.civilDate)) ||
        String(left.record.observedAt ?? left.record.createdAt).localeCompare(
          String(right.record.observedAt ?? right.record.createdAt),
        ) ||
        left.sourceIndex - right.sourceIndex,
    )
    .map(({ record }) => ({
      civilDate: String(record.civilDate),
      displayDate: displayCivilDate(String(record.civilDate)),
      context: nonEmptyText(record.context),
      rawText: nonEmptyText(record.rawText) as string,
      childQuote: nonEmptyText(record.childQuote),
    }));
}

function studentPrivateMarkers(student: StoredRecord): string[] {
  const markers = [
    nonEmptyText(student.displayName),
    nonEmptyText(student.firstName),
    nonEmptyText(student.lastName),
    nonEmptyText(student.preferredName),
    nonEmptyText(student.optionalCode),
    nonEmptyText(student.nationalIdentityNumber),
  ];
  if (Array.isArray(student.contacts)) {
    for (const candidate of student.contacts) {
      if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
        continue;
      }
      const contact = candidate as Record<string, unknown>;
      markers.push(
        nonEmptyText(contact.name),
        nonEmptyText(contact.phone),
        nonEmptyText(contact.id),
      );
    }
  }
  return markers.filter(
    (marker): marker is string => marker !== null && marker.length >= 2,
  );
}

function assertNoPrivateStudentLeak(options: {
  audience: SimpleObservationDocumentAudience;
  students: readonly StoredRecord[];
  selectedStudentId: string;
  observations: readonly ObservationExcerpt[];
  teacherSections: {
    strengths: string | null;
    supportAreas: string | null;
    homeSuggestions: string | null;
  };
}): void {
  const content = [
    ...options.observations.flatMap((observation) => [
      observation.rawText,
      observation.context,
      observation.childQuote,
    ]),
    options.teacherSections.strengths,
    options.teacherSections.supportAreas,
    options.teacherSections.homeSuggestions,
  ]
    .filter((value): value is string => value !== null)
    .join("\n");
  if (!content) return;
  if (UUID_PATTERN.test(content)) {
    throw new Error(
      "Gözlem belgesi teknik kayıt kimliği içerdiği için oluşturulamadı.",
    );
  }
  const normalizedContent = content.toLocaleLowerCase("tr-TR");
  const otherStudentMarkerFound = options.students
    .filter((student) => student.id !== options.selectedStudentId)
    .flatMap(studentPrivateMarkers)
    .some((marker) =>
      normalizedContent.includes(marker.toLocaleLowerCase("tr-TR")),
    );
  if (otherStudentMarkerFound) {
    throw new Error(
      "Gözlem belgesi başka bir çocuğa ait bilgi içerdiği için oluşturulamadı.",
    );
  }
  if (
    options.audience === "parent" &&
    (NATIONAL_IDENTITY_PATTERN.test(content) ||
      TURKISH_MOBILE_PATTERN.test(content))
  ) {
    throw new Error(
      "Veli gözlem belgesi kimlik veya telefon bilgisi içerdiği için oluşturulamadı.",
    );
  }
}

function blankOrTeacherText(value: string | null): string {
  if (value) {
    return `<div class="teacher-text">${escapeHtml(value).replaceAll("\n", "<br>")}</div>`;
  }
  return '<div class="blank-lines" aria-label="Öğretmenin dolduracağı boş alan"><span></span><span></span><span></span></div>';
}

function observationMarkup(observations: readonly ObservationExcerpt[]): string {
  if (observations.length === 0) {
    return '<p class="empty-observation">Bu dönem için seçili çocuğa ait paylaşılabilir gözlem kaydı bulunmuyor.</p>';
  }
  return observations
    .map(
      (observation) => `<article class="observation-entry">
        <header>
          <time datetime="${escapeHtml(observation.civilDate)}">${escapeHtml(observation.displayDate)}</time>
          ${observation.context ? `<span>${escapeHtml(observation.context)}</span>` : ""}
        </header>
        <p>${escapeHtml(observation.rawText).replaceAll("\n", "<br>")}</p>
        ${
          observation.childQuote
            ? `<blockquote><strong>Çocuğun sözü:</strong> ${escapeHtml(observation.childQuote).replaceAll("\n", "<br>")}</blockquote>`
            : ""
        }
      </article>`,
    )
    .join("\n");
}

function buildHtml(options: {
  audience: SimpleObservationDocumentAudience;
  schoolName: string;
  teacherName: string;
  classroomName: string;
  academicYearName: string;
  studentName: string;
  studentNumber: string | null;
  nationalIdentityNumber: string | null;
  periodLabel: string;
  generatedAt: string;
  generatedCivilDate: string;
  generatedDisplayDate: string;
  observations: readonly ObservationExcerpt[];
  teacherSections: {
    strengths: string | null;
    supportAreas: string | null;
    homeSuggestions: string | null;
  };
}): string {
  const isParent = options.audience === "parent";
  const audienceLabel = isParent ? "AİLE İLE PAYLAŞIM" : "İDAREYE SUNUM";
  const title = isParent ? "ÇOCUK GÖZLEM ÖZETİ" : "ÖĞRENCİ GÖZLEM ÖZETİ";
  const administrationIdentity = isParent
    ? ""
    : `<p><strong>Öğrenci no:</strong> ${escapeHtml(options.studentNumber ?? "—")}</p>
       <p><strong>T.C. kimlik no:</strong> ${escapeHtml(options.nationalIdentityNumber ?? "—")}</p>`;

  return `${SIMPLE_OBSERVATION_HTML_FILE_SIGNATURE}
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="maarifos-generated-at" content="${escapeHtml(options.generatedAt)}">
  <meta name="maarifos-civil-date" content="${escapeHtml(options.generatedCivilDate)}">
  <title>${escapeHtml(options.studentName)} · ${title}</title>
  <style>
    @page { size: A4 portrait; margin: 14mm; }
    :root { color-scheme: only light; font-family: Arial, "Helvetica Neue", sans-serif; color: #13243b; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; }
    body { font-size: 10pt; line-height: 1.48; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    main { width: 100%; margin: 0 auto; }
    .document-header { border-bottom: .7mm solid #176b5b; padding-bottom: 4mm; text-align: center; }
    .school-name { margin: 0 0 1.5mm; font-size: 12pt; font-weight: 700; }
    h1 { margin: 0; color: #10233e; font-size: 17pt; letter-spacing: .035em; }
    .audience { display: inline-block; margin-top: 2mm; padding: 1mm 3mm; border-radius: 99mm; background: #e2eee9; color: #145447; font-size: 8.5pt; font-weight: 700; letter-spacing: .05em; }
    .context { display: grid; grid-template-columns: 1fr 1fr; gap: 2mm 8mm; margin: 4mm 0; padding: 3mm 4mm; border: .25mm solid #b7c7c2; border-radius: 2mm; background: #f3f8f6; break-inside: avoid; page-break-inside: avoid; }
    .context p { margin: 0; overflow-wrap: anywhere; }
    .context strong { color: #154f45; }
    h2 { margin: 5mm 0 2mm; padding-bottom: 1.5mm; border-bottom: .25mm solid #b7c7c2; color: #154f45; font-size: 12pt; break-after: avoid; page-break-after: avoid; }
    .observation-entry { margin: 0 0 3mm; padding: 3mm 4mm; border: .25mm solid #c4cfcc; border-left: 1.2mm solid #448778; border-radius: 1.5mm; break-inside: avoid; page-break-inside: avoid; }
    .observation-entry header { display: flex; flex-wrap: wrap; gap: 2mm 4mm; align-items: baseline; margin-bottom: 1.5mm; color: #3f5751; }
    .observation-entry time { font-weight: 700; color: #173c35; }
    .observation-entry header span::before { content: "Bağlam: "; font-weight: 700; }
    .observation-entry p, blockquote { margin: 0; white-space: normal; overflow-wrap: anywhere; }
    blockquote { margin-top: 2mm; padding: 1.5mm 2.5mm; border-left: .6mm solid #aa94cf; background: #f7f3fc; }
    .empty-observation { min-height: 20mm; margin: 0; padding: 5mm; border: .25mm dashed #aebdb8; color: #566762; }
    .teacher-section { break-inside: avoid; page-break-inside: avoid; }
    .teacher-text { min-height: 18mm; padding: 3mm 4mm; border: .25mm solid #c4cfcc; border-radius: 1.5mm; white-space: normal; overflow-wrap: anywhere; }
    .blank-lines { min-height: 22mm; padding: 1mm 4mm; border: .25mm solid #c4cfcc; border-radius: 1.5mm; }
    .blank-lines span { display: block; height: 6mm; border-bottom: .2mm dotted #b5bfbc; }
    .document-footer { display: grid; grid-template-columns: 1fr 1fr; gap: 12mm; margin-top: 8mm; break-inside: avoid; page-break-inside: avoid; }
    .production { align-self: end; color: #44534f; }
    .signature { min-height: 26mm; text-align: center; }
    .signature strong { display: block; }
    .signature-name { min-height: 7mm; margin-top: 1.5mm; }
    .signature-line { width: 48mm; margin: 7mm auto 0; border-bottom: .3mm solid #233a34; }
    .signature-label { margin-top: 1.5mm; color: #596965; font-size: 8pt; }
    @media screen {
      html { background: #edf2f0; }
      body { max-width: 210mm; min-height: 297mm; margin: 8mm auto; padding: 14mm; box-shadow: 0 2mm 12mm rgb(20 45 38 / .15); }
    }
    @media screen and (max-width: 600px) {
      html { background: #fff; }
      body { width: 100%; min-height: 0; margin: 0; padding: 16px; box-shadow: none; font-size: 15px; line-height: 1.55; }
      .document-header { padding-bottom: 16px; }
      .school-name { margin-bottom: 6px; font-size: 16px; }
      h1 { font-size: 23px; line-height: 1.15; letter-spacing: .015em; }
      .audience { margin-top: 10px; padding: 5px 10px; font-size: 12px; }
      .context { grid-template-columns: minmax(0, 1fr); gap: 8px; margin: 16px 0; padding: 12px; }
      h2 { margin: 22px 0 10px; padding-bottom: 7px; font-size: 18px; line-height: 1.25; }
      .observation-entry, .teacher-text, .blank-lines { padding: 12px; }
      .observation-entry header { align-items: flex-start; gap: 5px 12px; }
      .document-footer { grid-template-columns: minmax(0, 1fr); gap: 24px; margin-top: 28px; }
      .production { margin: 0; }
    }
    @media print {
      body { width: auto; min-height: auto; }
      p, blockquote { orphans: 3; widows: 3; }
    }
  </style>
</head>
<body>
  <main aria-label="${title.toLocaleLowerCase("tr-TR")}">
    <header class="document-header">
      <p class="school-name">${escapeHtml(options.schoolName)}</p>
      <h1>${title}</h1>
      <span class="audience">${audienceLabel}</span>
    </header>
    <section class="context" aria-label="Belge bilgileri">
      <p><strong>Çocuğun adı soyadı:</strong> ${escapeHtml(options.studentName)}</p>
      <p><strong>Sınıf:</strong> ${escapeHtml(options.classroomName)}</p>
      <p><strong>Eğitim yılı:</strong> ${escapeHtml(options.academicYearName)}</p>
      <p><strong>Gözlem dönemi:</strong> ${escapeHtml(options.periodLabel)}</p>
      ${administrationIdentity}
    </section>
    <section aria-labelledby="observation-heading">
      <h2 id="observation-heading">Gözlem özeti · Öğretmenin kaynak kayıtları</h2>
      ${observationMarkup(options.observations)}
    </section>
    <section class="teacher-section" aria-labelledby="strengths-heading">
      <h2 id="strengths-heading">Güçlü yönler</h2>
      ${blankOrTeacherText(options.teacherSections.strengths)}
    </section>
    <section class="teacher-section" aria-labelledby="support-heading">
      <h2 id="support-heading">Desteklenecek alan</h2>
      ${blankOrTeacherText(options.teacherSections.supportAreas)}
    </section>
    <section class="teacher-section" aria-labelledby="home-heading">
      <h2 id="home-heading">Evde öneri</h2>
      ${blankOrTeacherText(options.teacherSections.homeSuggestions)}
    </section>
    <footer class="document-footer">
      <p class="production"><strong>Belge tarihi:</strong> ${escapeHtml(options.generatedDisplayDate)}</p>
      <section class="signature" aria-label="Öğretmen imza alanı">
        <strong>Okul Öncesi Öğretmeni</strong>
        <div class="signature-name">${escapeHtml(options.teacherName)}</div>
        <div class="signature-line" aria-hidden="true"></div>
        <div class="signature-label">İmza</div>
      </section>
    </footer>
  </main>
</body>
</html>`;
}

/**
 * Snapshot'ı değiştirmeden yalnız seçili çocuk ve aktif sınıf kapsamındaki ham
 * öğretmen gözlemlerini A4 baskıya hazır, dış kaynaksız bir HTML belgesine taşır.
 */
export function createSimpleObservationDocument(
  input: SimpleObservationDocumentInput,
): SimpleObservationDocumentFile {
  if (input.audience !== "parent" && input.audience !== "administration") {
    throw new Error("Gözlem belgesi hedefi veli veya idare olmalıdır.");
  }
  const schoolName = requireText(input.schoolName, "Okul adı");
  const teacherName = requireText(input.teacherName, "Öğretmen adı soyadı");
  const classroomName = requireText(input.classroomName, "Sınıf adı");
  const academicYearName = requireText(input.academicYearName, "Eğitim yılı");
  const startCivilDate = requireCivilDate(
    input.period.startCivilDate,
    "Gözlem dönemi başlangıcı",
  );
  const endCivilDate = requireCivilDate(
    input.period.endCivilDate,
    "Gözlem dönemi bitişi",
  );
  if (endCivilDate < startCivilDate) {
    throw new Error("Gözlem dönemi bitişi başlangıçtan önce olamaz.");
  }

  const academicYear = input.snapshot.academicYears.find(
    (record) =>
      record.id === input.scope.academicYearId &&
      isLiveRecord(record) &&
      record.status !== "archived",
  );
  const classroom = input.snapshot.classrooms.find(
    (record) =>
      record.id === input.scope.classroomId &&
      record.academicYearId === input.scope.academicYearId &&
      isLiveRecord(record) &&
      record.status !== "archived" &&
      record.archiveStatus !== "archived",
  );
  if (!academicYear || !classroom) {
    throw new Error("Aktif sınıf ve eğitim yılı gözlem belgesi için doğrulanamadı.");
  }
  const snapshotClassroomName = nonEmptyText(classroom.name);
  const snapshotAcademicYearName = nonEmptyText(academicYear.name);
  if (
    (snapshotClassroomName && snapshotClassroomName !== classroomName) ||
    (snapshotAcademicYearName && snapshotAcademicYearName !== academicYearName)
  ) {
    throw new Error("Belge başlığı aktif sınıf ve eğitim yılı kaydıyla eşleşmelidir.");
  }
  const startDate = nonEmptyText(academicYear.startDate);
  const endDate = nonEmptyText(academicYear.endDate);
  if (
    (startDate && isCivilDate(startDate) && startCivilDate < startDate) ||
    (endDate && isCivilDate(endDate) && endCivilDate > endDate)
  ) {
    throw new Error("Gözlem dönemi aktif eğitim yılının içinde olmalıdır.");
  }

  const student = input.snapshot.students.find(
    (record) => record.id === input.studentId,
  );
  if (!student || !studentIsActiveInScope(student, input.scope, academicYear, input.period)) {
    throw new Error("Seçili çocuk aktif sınıf kapsamında doğrulanamadı.");
  }
  const studentName = nonEmptyText(student.displayName);
  if (!studentName) {
    throw new Error("Seçili çocuğun adı gözlem belgesi için eksik.");
  }

  const period: SimpleObservationPeriod = Object.freeze({
    startCivilDate,
    endCivilDate,
    ...(nonEmptyText(input.period.label)
      ? { label: nonEmptyText(input.period.label) }
      : {}),
  });
  const periodLabel = nonEmptyText(period.label) ??
    `${displayCivilDate(startCivilDate)} – ${displayCivilDate(endCivilDate)}`;
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const {
    civilDate: generatedCivilDate,
    displayDate: generatedDisplayDate,
  } = generatedDateParts(generatedAt);
  const observations = observationsForStudent(
    input.snapshot.observations,
    input.scope,
    input.studentId,
    period,
    isCivilDate(String(academicYear.startDate)) && isCivilDate(String(academicYear.endDate)) ? (civilDate) => resolveStudentMembershipOn(student, { ...input.scope, academicYear, civilDate }).eligible : undefined,
  );
  const teacherSections = {
    strengths: nonEmptyText(input.teacherSections?.strengths),
    supportAreas: nonEmptyText(input.teacherSections?.supportAreas),
    homeSuggestions: nonEmptyText(input.teacherSections?.homeSuggestions),
  };
  assertNoPrivateStudentLeak({
    audience: input.audience,
    students: input.snapshot.students,
    selectedStudentId: input.studentId,
    observations,
    teacherSections,
  });
  const html = buildHtml({
    audience: input.audience,
    schoolName,
    teacherName,
    classroomName,
    academicYearName,
    studentName,
    studentNumber: nonEmptyText(student.optionalCode),
    nationalIdentityNumber: nonEmptyText(student.nationalIdentityNumber),
    periodLabel,
    generatedAt,
    generatedCivilDate,
    generatedDisplayDate,
    observations,
    teacherSections,
  });
  const audienceFileLabel = input.audience === "parent" ? "Aile" : "Idare";
  return {
    format: SIMPLE_OBSERVATION_DOCUMENT_FORMAT,
    audience: input.audience,
    fileName: `MaarifOS_Gozlem_Ozeti_${audienceFileLabel}_${safeFileSegment(studentName)}_${startCivilDate}_${endCivilDate}.html`,
    mimeType: SIMPLE_OBSERVATION_DOCUMENT_MIME_TYPE,
    bytes: encoder.encode(html),
    html,
    observationCount: observations.length,
    generatedAt,
    generatedCivilDate,
    period,
  };
}

/** UI indirme ve tarayıcıdan yerel PDF yazdırma akışlarının Blob sözleşmesi. */
export function simpleObservationDocumentBlob(
  file: SimpleObservationDocumentFile,
): Blob {
  const bytes = new Uint8Array(file.bytes.byteLength);
  bytes.set(file.bytes);
  return new Blob([bytes.buffer], { type: file.mimeType });
}

export async function createSimpleObservationPdfDocument(input: SimpleObservationDocumentInput, options: {
  runtime?: SemanticTaggedPdfRuntime; fields?: readonly string[]; appearance?: "color" | "ink-saving";
} = {}) {
  const validated = createSimpleObservationDocument(input);
  const student = input.snapshot.students.find((record) => record.id === input.studentId)!;
  const year = input.snapshot.academicYears.find((record) => record.id === input.scope.academicYearId)!;
  const fields = options.fields ?? ["observations", "strengths", "supportAreas", "homeSuggestions"];
  const nodes: SemanticPdfNode[] = [
    { kind: "heading", level: 1, text: input.audience === "parent" ? "AİLE GÖZLEM ÖZETİ" : "İDARE GÖZLEM ÖZETİ" },
    { kind: "paragraph", tone: "meta", text: `${input.schoolName}\n${input.classroomName} · ${input.academicYearName}` },
    { kind: "paragraph", text: `Çocuğun adı soyadı: ${String(student.displayName)}\nDönem: ${input.period.startCivilDate} / ${input.period.endCivilDate}` },
  ];
  if (input.audience === "administration") nodes.push({ kind: "paragraph", text: `Öğrenci no: ${String(student.optionalCode ?? "—")}\nT.C. kimlik no: ${String(student.nationalIdentityNumber ?? "—")}` });
  if (fields.includes("observations")) {
    nodes.push({ kind: "heading", level: 2, text: "Gözlem özeti · Öğretmenin kaynak kayıtları" });
    const records = observationsForStudent(input.snapshot.observations, input.scope, input.studentId, input.period,
      isCivilDate(String(year.startDate)) && isCivilDate(String(year.endDate)) ? (civilDate) => resolveStudentMembershipOn(student, { ...input.scope, academicYear: year, civilDate }).eligible : undefined);
    records.forEach((record) => nodes.push({ kind: "paragraph", tone: "meta", text: `${record.displayDate}${record.context ? ` · ${record.context}` : ""}` },
      { kind: "paragraph", text: record.rawText }, ...(record.childQuote ? [{ kind: "paragraph" as const, text: `Çocuğun sözü: ${record.childQuote}` }] : [])));
    if (!records.length) nodes.push({ kind: "paragraph", text: "Bu dönemde kayıtlı gözlem bulunmuyor." });
  }
  const choices = [{ id: "observations", label: "Gözlem kayıtları" }, { id: "strengths", label: "Güçlü yönler" }, { id: "supportAreas", label: "Desteklenecek alan" }, { id: "homeSuggestions", label: "Evde öneri" }];
  for (const section of choices.slice(1)) if (fields.includes(section.id)) {
    const text = input.teacherSections?.[section.id as keyof SimpleObservationTeacherSections];
    if (text?.trim()) nodes.push({ kind: "heading", level: 2, text: section.label }, { kind: "paragraph", text });
  }
  nodes.push({ kind: "paragraph", text: `Okul Öncesi Öğretmeni: ${input.teacherName}\nİmza: ____________________` });
  const bytes = await createSemanticTaggedPdf({ title: "MaarifOS Gözlem Özeti", language: "tr-TR", nodes,
    theme: options.appearance === "ink-saving" ? TEACHER_PRINT_THEME : TEACHER_DOCUMENT_THEME,
    includeTotalPages: true, artifactHeaderOnFirstPage: false,
    artifactHeaderText: `${String(student.displayName)} · ${input.classroomName} · ${input.period.startCivilDate} / ${input.period.endCivilDate}`,
  }, options.runtime);
  const source = structuredClone({ ...input, generatedAt: validated.generatedAt });
  const min = isCivilDate(String(year.operationalStartDate)) ? String(year.operationalStartDate) : String(year.startDate ?? input.period.startCivilDate);
  const max = String(year.endDate ?? input.period.endCivilDate);
  const recipe: PdfPreviewRecipe = {
    supportsAppearance: true,
    title: `${String(student.displayName)} · Gözlem özeti`, fields: choices,
    fieldPresets: [{ id: "source-notes", label: "Yalnız gözlem kayıtları", fields: ["observations"] }],
    students: [{ id: input.studentId, label: String(student.displayName) }],
    period: { min, max }, initial: { fields, studentIds: [input.studentId], periodStart: input.period.startCivilDate, periodEnd: input.period.endCivilDate },
    async build(selection) { validatePdfSelection(recipe, selection); return createSimpleObservationPdfDocument({ ...source,
      period: { startCivilDate: selection.periodStart!, endCivilDate: selection.periodEnd! } }, { ...options, fields: selection.fields, appearance: selection.appearance }); },
  };
  registerPdfPreviewRecipe(bytes, recipe);
  return { ...validated, format: "pdf" as const, mimeType: "application/pdf", bytes, fileName: validated.fileName.replace(/\.html$/u, ".pdf") };
}
