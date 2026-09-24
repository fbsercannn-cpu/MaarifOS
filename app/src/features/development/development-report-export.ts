import type { DataSnapshot } from "../../core/domain/model.ts";
import type { BrowserFileDownload } from "../documents/browser-file-download.ts";
import { TEACHER_DOCUMENT_THEME } from "../documents/document-theme.ts";
import {
  createSemanticTaggedPdf,
  semanticTaggedPdfPageCount,
  type SemanticPdfNode,
  type SemanticTaggedPdfDocument,
  type SemanticTaggedPdfRuntime,
} from "../documents/semantic-tagged-pdf.ts";
import {
  DEVELOPMENT_REPORT_NOTICE,
  DEVELOPMENT_REPORT_TITLE,
  type DevelopmentReportEvidenceSnapshot,
  type DevelopmentReportRecord,
} from "./development-report-model.ts";
import { requireApprovedDevelopmentReport } from "./development-report.ts";
import { resolveTymmOfficialProgramAccessUrl } from "../curriculum/tymm-official-resource-catalog.ts";

export interface DevelopmentReportPdfOptions {
  readonly runtime?: SemanticTaggedPdfRuntime;
  readonly exportedAt?: string;
}

export interface DevelopmentReportPdfFile extends BrowserFileDownload {
  readonly mimeType: "application/pdf";
  readonly reportId: string;
  readonly revision: number;
  readonly contentSha256: string;
  readonly approvedAt: string;
  readonly exportedAt: string;
  readonly pageCount: number;
  readonly observationIds: readonly string[];
}

const REPORT_FOOTER = "Kişisel çocuk bilgisi içerir. Yalnız yetkili kullanım içindir.";

function civilDateLabel(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
}

function timestampLabel(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).format(new Date(value)) + " (Türkiye saati)";
}

function safeFileSegment(value: string): string {
  // The visible document retains the exact name; only filesystem delimiters change.
  const safe = value.trim().replace(/[\\/:*?"<>|\u0000-\u001f]/gu, "-").replace(/\s+/gu, "_");
  return Array.from(safe).slice(0, 96).join("") || "Cocuk";
}

function evidenceNodes(evidence: DevelopmentReportEvidenceSnapshot, index: number): SemanticPdfNode[] {
  const domains = [...new Set(evidence.confirmedTargets.map((target) => target.domain))];
  const nodes: SemanticPdfNode[] = [
    { kind: "heading", level: 3, text: `${index + 1}. gözlem - ${civilDateLabel(evidence.civilDate)}` },
    { kind: "paragraph", tone: "meta", text: `Gözlem zamanı: ${timestampLabel(evidence.observedAt)}` },
    { kind: "paragraph", tone: "meta", text: `Etkinlik: ${evidence.contextSnapshot.activityTitle}` },
    { kind: "paragraph", tone: "meta", text: `Öğrenme alanı: ${domains.join(", ") || "Onaylı program bağlantısı yok"}` },
    { kind: "paragraph", tone: "meta", text: `Bu gözlemde destek: ${evidence.supportLabel || "Kaydedilmedi"}` },
  ];
  if (evidence.developmentSelection) {
    nodes.push({ kind: "paragraph", tone: "meta", text: `Gözlemde seçilen yaş bandı: ${evidence.developmentSelection.ageBand} ay` });
  }
  if (evidence.context) {
    nodes.push({ kind: "heading", level: 4, text: "Gözlem bağlamı" }, { kind: "paragraph", text: evidence.context });
  }
  nodes.push(
    { kind: "heading", level: 4, text: "Ham gözlem - değiştirilmeden" },
    { kind: "paragraph", text: evidence.rawText },
  );
  if (evidence.childQuote) {
    nodes.push({ kind: "heading", level: 4, text: "Kaydedilmiş çocuk sözü" }, { kind: "paragraph", text: evidence.childQuote });
  }
  if (evidence.confirmedTargets.length) {
    nodes.push({ kind: "heading", level: 4, text: "Öğretmenin onayladığı program bağlantıları" });
    for (const target of evidence.confirmedTargets) {
      const currentAccessUrl = resolveTymmOfficialProgramAccessUrl(
        target.sourceUrl,
        target.sourceSha256,
        target.sourcePage,
      );
      const sourceIdentity = currentAccessUrl
        ? target.sourceUrl
        : "doğrulanmamış kayıtta saklı";
      nodes.push(
        { kind: "paragraph", text: `${target.domain} - ${target.referenceCode}: ${target.referenceTitle}` },
        {
          kind: "paragraph", tone: "meta",
          ...(currentAccessUrl ? { href: currentAccessUrl } : {}),
          text: `Kaynak: ${target.sourceLabel}. Sürüm: ${target.sourceVersion}.${target.sourcePage ? ` Sayfa: ${target.sourcePage}.` : ""} Kaynak kimliği: ${sourceIdentity}. ${currentAccessUrl ? `Güncel erişim: ${currentAccessUrl}` : "Güncel erişim: doğrulanamadı."}`,
        },
      );
    }
  }
  return nodes;
}

function semanticReport(record: DevelopmentReportRecord, exportedAt: string): SemanticTaggedPdfDocument {
  const seal = record.approvalSeal;
  if (record.status !== "approved" || !seal) {
    throw new Error("PDF için öğretmenin güncel raporu onaylaması gerekir.");
  }
  const rows: string[][] = [
    ["Çocuk", record.studentSnapshot.displayName],
    ["Sınıf", record.scopeSnapshot.classroomName],
    ["Eğitim yılı", record.scopeSnapshot.academicYearName],
    ["Dönem", `${civilDateLabel(record.periodStart)} - ${civilDateLabel(record.periodEnd)}`],
  ];
  if (record.scopeSnapshot.schoolName) rows.push(["Okul", record.scopeSnapshot.schoolName]);
  if (record.scopeSnapshot.teacherName) rows.push(["Öğretmen", record.scopeSnapshot.teacherName]);
  const differentDays = new Set(record.evidenceSnapshots.map((evidence) => evidence.civilDate)).size;
  return {
    title: DEVELOPMENT_REPORT_TITLE,
    language: "tr-TR",
    creator: "MaarifOS",
    theme: TEACHER_DOCUMENT_THEME,
    artifactHeaderOnFirstPage: false,
    includeTotalPages: true,
    artifactHeaderText: `${record.studentSnapshot.displayName} · ${record.scopeSnapshot.schoolName ?? ""} · ${record.scopeSnapshot.classroomName} · ${record.scopeSnapshot.academicYearName} · ${civilDateLabel(record.periodStart)} / ${civilDateLabel(record.periodEnd)}`,
    artifactFooterText: REPORT_FOOTER,
    // No child name, evidence UUID, raw text or teacher judgement in metadata.
    technicalMetadata: [
      { key: "document-type", value: "teacher-observation-summary" },
      { key: "document-schema-version", value: "1" },
      { key: "approval-status", value: "teacher-approved" },
    ],
    nodes: [
      { kind: "heading", level: 1, text: DEVELOPMENT_REPORT_TITLE },
      { kind: "paragraph", tone: "meta", text: DEVELOPMENT_REPORT_NOTICE },
      {
        kind: "table", headers: ["Kapsam", "Onaylanan rapor bilgisi"], rows,
        summary: "Öğretmenin onayladığı çocuk, sınıf ve dönem bilgileri",
        columnWeights: [1, 3], rowHeaderColumn: 0,
      },
      {
        kind: "paragraph", tone: "meta",
        text: `Bu seçki ${differentDays} farklı gündeki ${record.evidenceSnapshots.length} gözlem kaydını içerir. Kayıt sayısı gelişim düzeyi, başarı puanı veya kanıt yeterliliği kararı değildir.`,
      },
      { kind: "heading", level: 2, text: "Seçilen gözlem kanıtları" },
      { kind: "paragraph", tone: "meta", text: "Ham gözlemler ve kaydedilmiş çocuk sözleri aynen aktarılır. Program bağlantısı ve destek bilgisi ayrı gösterilir." },
      ...record.evidenceSnapshots.flatMap(evidenceNodes),
      { kind: "heading", level: 2, text: "Öğretmenin değerlendirmesi", pageBreakBefore: true },
      { kind: "paragraph", tone: "meta", text: "Bu bölüm öğretmenin seçili kanıtları inceleyerek yazdığı yorumdur; ham gözlem veya otomatik gelişim hükmü değildir." },
      { kind: "paragraph", text: record.teacherEvaluation },
      { kind: "heading", level: 2, text: "Sonraki destek adımları" },
      { kind: "paragraph", text: record.nextSupport || "Öğretmen bu raporda sonraki destek adımı belirtmedi." },
      { kind: "heading", level: 2, text: "Öğretmen onayı ve kanıt eki", pageBreakBefore: true, forcePageBreakBefore: true },
      { kind: "paragraph", text: `Öğretmen onayı: ${timestampLabel(seal.approvedAt)}` },
      { kind: "paragraph", tone: "meta", text: `Onay zamanı (UTC): ${seal.approvedAt}` },
      { kind: "paragraph", tone: "meta", text: `Rapor kimliği: ${record.id} - Revizyon: ${record.revision}` },
      { kind: "paragraph", tone: "meta", text: `Onaylanan içerik SHA-256: ${seal.contentSha256}` },
      { kind: "paragraph", tone: "meta", text: `PDF oluşturma zamanı: ${timestampLabel(exportedAt)}` },
      ...record.evidenceSnapshots.flatMap((evidence, index): SemanticPdfNode[] => [
        { kind: "heading", level: 3, text: `${index + 1}. gözlem · ${civilDateLabel(evidence.civilDate)}` },
        { kind: "paragraph", tone: "meta", text: `Kaynak gözlem kimliği: ${evidence.observationId}` },
      ]),
    ],
  };
}

/** The same source-validated semantic content can be used for a local preview. */
export async function buildDevelopmentReportPdfContent(
  snapshot: DataSnapshot,
  reportId: string,
  options: Pick<DevelopmentReportPdfOptions, "exportedAt"> = {},
): Promise<SemanticTaggedPdfDocument> {
  const exportedAt = options.exportedAt ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(exportedAt)) || new Date(exportedAt).toISOString() !== exportedAt) {
    throw new Error("PDF oluşturma zamanı geçerli bir UTC tarihi olmalıdır.");
  }
  const verified = await requireApprovedDevelopmentReport(structuredClone(snapshot), reportId);
  return semanticReport(verified.record, exportedAt);
}

/** Generates locally; the caller must explicitly download after its final source check. */
export async function createDevelopmentReportPdfDocument(
  snapshot: DataSnapshot,
  reportId: string,
  options: DevelopmentReportPdfOptions = {},
): Promise<DevelopmentReportPdfFile> {
  const exportedAt = options.exportedAt ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(exportedAt)) || new Date(exportedAt).toISOString() !== exportedAt) {
    throw new Error("PDF oluşturma zamanı geçerli bir UTC tarihi olmalıdır.");
  }
  // Detach before async approval hashing/font loading so callers cannot alter the rendered revision.
  const verified = await requireApprovedDevelopmentReport(structuredClone(snapshot), reportId);
  const record = verified.record;
  const content = semanticReport(record, exportedAt);
  const bytes = await createSemanticTaggedPdf(content, options.runtime);
  return {
    bytes,
    mimeType: "application/pdf",
    fileName: `MaarifOS_Ogretmen_Gozlem_Ozeti_${safeFileSegment(record.studentSnapshot.displayName)}_${record.periodStart}_${record.periodEnd}_r${record.revision}.pdf`,
    reportId: record.id,
    revision: record.revision,
    contentSha256: record.contentSha256,
    approvedAt: record.approvalSeal!.approvedAt,
    exportedAt,
    pageCount: semanticTaggedPdfPageCount(bytes),
    observationIds: [...record.selectedObservationIds],
  };
}
