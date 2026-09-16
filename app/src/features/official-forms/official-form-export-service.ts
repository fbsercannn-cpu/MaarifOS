/**
 * T.C. Hazine ve Maliye Bakanlığı & Gelir İdaresi Başkanlığı Standartları
 * Resmî MEB TTKB Formları 4'lü Dışa Aktarma Servisi (Quad-Export Engine)
 * Mimari: %100 Client-Side, Sıfır Harici API, Native OpenXML (.xlsx), Direct PDF, A4 Paged Media & Word
 */

import { downloadBrowserFile } from "../documents/browser-file-download.ts";

export const XLSX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" as const;
export const WORD_MIME_TYPE = "application/msword;charset=utf-8" as const;

export interface ExcelColumnDefinition {
  header: string;
  key: string;
  width?: number;
  align?: "left" | "center" | "right";
  isNumeric?: boolean;
}

export interface ExportTableToExcelOptions {
  fileName: string;
  sheetName?: string;
  title: string;
  subtitle?: string;
  metadata?: Array<{ label: string; value: string }>;
  columns: ExcelColumnDefinition[];
  rows: Array<Record<string, unknown>>;
  /**
   * Toplam satırı formülü:
   * Sütun index'lerine göre SUBTOTAL(109, C4:C100) formül enjeksiyonu.
   * Filtrelenen gizli satırların sayılmasını engeller.
   */
  includeSubtotals?: boolean;
}

/**
 * Native OpenXML (.xlsx) tablosu üretir ve formül enjeksiyonu (SUBTOTAL 109) uygular.
 */
export async function exportOfficialTableToExcel({
  fileName,
  sheetName = "Resmî Çizelge",
  title,
  subtitle,
  metadata = [],
  columns,
  rows,
  includeSubtotals = false,
}: ExportTableToExcelOptions): Promise<void> {
  const x = await import("xlsx");
  const wb = x.utils.book_new();

  const aoa: unknown[][] = [];

  // 1. Başlık ve Açıklama Satırları
  aoa.push([title]);
  if (subtitle) {
    aoa.push([subtitle]);
  }

  // 2. Metadata (Okul, Öğretmen, Tarih vb.)
  if (metadata.length > 0) {
    const metaRow = metadata.map((m) => `${m.label}: ${m.value}`).join("  |  ");
    aoa.push([metaRow]);
  }
  aoa.push([]); // Boş ayırıcı satır

  const headerRowIndex = aoa.length; // 0-indexed header row

  // 3. Başlık Sütunları
  aoa.push(columns.map((c) => c.header));

  // 4. Veri Satırları
  for (const row of rows) {
    const rowValues = columns.map((col) => {
      const val = row[col.key];
      if (val === undefined || val === null) return "";
      if (typeof val === "boolean") return val ? "✓" : "";
      return val;
    });
    aoa.push(rowValues);
  }

  const dataEndRowIndex = aoa.length - 1;

  // 5. Toplam / Özet Satırı (SUBTOTAL 109 Formül Enjeksiyonu)
  if (includeSubtotals && rows.length > 0) {
    const totalRow: unknown[] = columns.map((col, colIdx) => {
      if (colIdx === 0) return "TOPLAM (Görünen / Filtrelenmiş)";
      if (col.isNumeric) {
        const colLetter = String.fromCharCode(65 + colIdx);
        const startRow = headerRowIndex + 2; // 1-indexed for Excel
        const endRow = dataEndRowIndex + 1;
        // SUBTOTAL(109, Range) -> 109: gizli satırları toplamayan SUM
        return { f: `SUBTOTAL(109, ${colLetter}${startRow}:${colLetter}${endRow})` };
      }
      return "";
    });
    aoa.push(totalRow);
  }

  const ws = x.utils.aoa_to_sheet(aoa);

  // Sütun genişlikleri
  ws["!cols"] = columns.map((c) => ({
    wch: c.width || Math.max(c.header.length + 4, 14),
  }));

  // Otomatik filtre (AutoFilter)
  if (rows.length > 0) {
    const lastColLetter = String.fromCharCode(65 + columns.length - 1);
    ws["!autofilter"] = {
      ref: `A${headerRowIndex + 1}:${lastColLetter}${dataEndRowIndex + 1}`,
    };
  }

  // Sayfa Yazdırma Ayarları
  ws["!margins"] = {
    left: 0.3,
    right: 0.3,
    top: 0.5,
    bottom: 0.5,
    header: 0.2,
    footer: 0.2,
  };

  x.utils.book_append_sheet(wb, ws, sheetName);

  const bytes = new Uint8Array(
    x.write(wb, {
      type: "array",
      bookType: "xlsx",
      compression: true,
    }),
  );

  downloadBrowserFile({
    bytes,
    mimeType: XLSX_MIME_TYPE,
    fileName: fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`,
  });
}

/**
 * Direct PDF indirme motoru.
 * createSemanticTaggedPdf ile doğrudan standart A4 PDF dosyası üretir ve indirir.
 */
export async function downloadOfficialFormPdf(
  fileName: string,
  title: string,
  metadata: Array<{ label: string; value: string }>,
  headers: string[],
  rows: string[][],
): Promise<void> {
  try {
    const { createSemanticTaggedPdf } = await import("../documents/semantic-tagged-pdf.ts");
    const bytes = await createSemanticTaggedPdf({
      title,
      language: "tr-TR",
      orientation: "portrait",
      nodes: [
        { kind: "heading", level: 1, text: title },
        ...metadata.map((m) => ({ kind: "paragraph" as const, tone: "meta" as const, text: `${m.label}: ${m.value}` })),
        {
          kind: "table",
          headers,
          rows,
          fontSize: 9,
          cellPadding: 4,
        },
      ],
    });
    downloadBrowserFile({
      bytes,
      mimeType: "application/pdf",
      fileName: fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`,
    });
  } catch {
    printOfficialFormA4(fileName);
  }
}

/**
 * A4 CSS Paged Media doğrudan yazdırma motoru.
 * Sayfadaki .official-sheet elementini izole bir görünmez iframe içerisine aktararak
 * ana SPA kabuğundan, alt gezinme çubuğundan ve mobil kaydırma yapısından %100 yalıtır.
 */
/**
 * A4 CSS Paged Media doğrudan yazdırma motoru.
 * Sayfadaki resmî belge elementini (.official-sheet, .official-form-container) izole bir
 * off-screen iframe içerisine klonlar. Ana SPA kabuğundan, alt navigasyon çubuğundan (.bottom-nav)
 * ve mobil kaydırma yapısından %100 yalıtarak saf A4 çıktısı üretir.
 * Tüm input ve textarea değerlerini düz metne dönüştürür; butonları ve arayüz kontrollerini temizler.
 */
export function printOfficialFormA4(documentTitle: string): void {
  if (typeof document === "undefined") return;

  const targetElement = document.querySelector<HTMLElement>(
    ".official-sheet, .official-form-container, .a4-printable, [data-printable='true']",
  );

  if (!targetElement) {
    // Fallback: Doğrudan pencereyi yazdır
    const previousTitle = document.title;
    try {
      document.title = documentTitle;
      window.print();
    } finally {
      window.setTimeout(() => {
        document.title = previousTitle;
      }, 1500);
    }
    return;
  }

  // Belge elemanını klonla
  const clone = targetElement.cloneNode(true) as HTMLElement;

  // Orijinal formdaki tüm input, textarea ve select değerlerini klona aktar
  const originalInputs = targetElement.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select");
  const cloneInputs = clone.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select");

  originalInputs.forEach((input, index) => {
    const cloneInput = cloneInputs[index];
    if (!cloneInput) return;

    let text = "";
    if (input instanceof HTMLSelectElement) {
      text = input.options[input.selectedIndex]?.text || input.value;
    } else {
      text = input.value;
    }

    const existingSpan = cloneInput.parentElement?.querySelector<HTMLElement>(".print-only-text");
    if (existingSpan) {
      if (text) existingSpan.textContent = text;
      existingSpan.style.display = "block";
    } else {
      const span = document.createElement("span");
      span.className = "print-only-text";
      span.textContent = text;
      span.style.display = "block";
      span.style.whiteSpace = "pre-wrap";
      span.style.wordBreak = "break-word";
      cloneInput.parentElement?.insertBefore(span, cloneInput);
    }
  });

  // Klon içerisinden tüm arayüz butonlarını, aksiyon barlarını ve form kontrollerini kaldır
  clone.querySelectorAll("button, select, input, textarea, .official-form-actions, .no-print, .official-workspace-header").forEach((el) => el.remove());

  // Yatay belge tespiti (EK-15, Sınıf Beceri Matrisi vb.)
  const isLandscape =
    targetElement.classList.contains("is-landscape") ||
    targetElement.querySelector(".is-landscape") !== null ||
    documentTitle.toLowerCase().includes("ek-15") ||
    documentTitle.toLowerCase().includes("matris") ||
    documentTitle.toLowerCase().includes("cizelge");

  // İzole off-screen iframe oluştur (visibility: hidden ve display: none YASAKTIR - Chromium beyaz sayfa basar!)
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.setAttribute("tabindex", "-1");
  frame.title = documentTitle;
  Object.assign(frame.style, {
    position: "fixed",
    left: "-10000px",
    top: "0",
    width: isLandscape ? "297mm" : "210mm",
    height: isLandscape ? "210mm" : "297mm",
    border: "0",
    opacity: "0",
    pointerEvents: "none",
    zIndex: "-9999",
  });

  const htmlContent = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <title>${documentTitle.replace(/[<>&"]/g, "")}</title>
  <style>
    @page {
      size: ${isLandscape ? "A4 landscape" : "A4 portrait"};
      margin: 8mm 10mm 10mm 10mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff !important;
      color: #000000 !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: ${isLandscape ? "7.5pt" : "8.5pt"};
      line-height: 1.35;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .official-form-modal,
    .official-workspace-overlay,
    .official-workspace-body {
      position: static !important;
      inset: auto !important;
      background: transparent !important;
      padding: 0 !important;
      margin: 0 !important;
      overflow: visible !important;
      width: 100% !important;
      max-width: 100% !important;
    }
    .official-form-container,
    .official-sheet {
      width: 100% !important;
      max-width: 100% !important;
      padding: 0 !important;
      margin: 0 !important;
      box-shadow: none !important;
      border: none !important;
      background: #ffffff !important;
    }
    .official-sheet__header,
    .official-form-header {
      text-align: center;
      margin-bottom: 8pt;
      display: block !important;
    }
    .official-sheet__title,
    .official-form-header h1,
    .official-form-header h2 {
      font-size: 13pt !important;
      font-weight: 800 !important;
      color: #173862 !important;
      text-align: center !important;
      margin: 0 0 6pt 0 !important;
      letter-spacing: 0.5px !important;
      display: block !important;
    }
    .official-sheet__guidance {
      background: #fafafa !important;
      border-left: 2.5pt solid #555 !important;
      padding: 4pt 8pt !important;
      font-size: 8pt !important;
      color: #222 !important;
      margin-bottom: 6pt !important;
      display: block !important;
    }
    table, table.official-table {
      width: 100% !important;
      border-collapse: collapse !important;
      margin-bottom: 6pt !important;
      border: 1.5pt solid #173862 !important;
      page-break-inside: auto;
      break-inside: auto;
    }
    thead {
      display: table-header-group !important;
    }
    tfoot {
      display: table-footer-group !important;
    }
    tr {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    th, td, .official-table th, .official-table td {
      border: 1pt solid #475569 !important;
      padding: 4pt 6pt !important;
      font-size: ${isLandscape ? "7.5pt" : "8.5pt"} !important;
      line-height: 1.25 !important;
      vertical-align: top !important;
      color: #000000 !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .official-table__section-header {
      background-color: #f1f5f9 !important;
      color: #0f172a !important;
      font-weight: 700 !important;
      font-size: 9pt !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .official-table__label {
      background-color: #f8fafc !important;
      font-weight: 600 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .no-print, .official-form-actions, .of-input, .of-textarea, .no-print-select, button {
      display: none !important;
    }
    .print-only-text {
      display: block !important;
      white-space: pre-wrap !important;
      word-break: break-word !important;
      color: #000000 !important;
      font-size: ${isLandscape ? "7.5pt" : "8.5pt"} !important;
    }
    .official-sheet__footer,
    .official-form-footer {
      display: flex !important;
      justify-content: space-between !important;
      align-items: flex-end !important;
      margin-top: 8pt !important;
      padding-top: 4pt !important;
      border-top: 1pt solid #cbd5e1 !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .signature-line {
      margin-top: 6pt !important;
      color: #334155 !important;
    }
    .official-sheet__page-num {
      font-weight: 800 !important;
      color: #173862 !important;
    }
  </style>
</head>
<body>
  ${clone.outerHTML}
</body>
</html>`;

  frame.srcdoc = htmlContent;

  let printed = false;
  const doPrint = () => {
    if (printed) return;
    printed = true;
    try {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    } catch {
      window.print();
    } finally {
      window.setTimeout(() => {
        frame.remove();
      }, 5000);
    }
  };

  frame.onload = () => {
    window.setTimeout(doPrint, 250);
  };

  document.body.appendChild(frame);

  // Failsafe timer (onload gecikirse veya tetiklenmezse devreye girer)
  window.setTimeout(() => {
    if (!printed) doPrint();
  }, 1000);
}

/**
 * Microsoft Word (.doc) dışa aktarımı.
 */
export function exportOfficialFormToWord(
  fileName: string,
  title: string,
  bodyHtml: string,
): void {
  const fullHtml = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>${title}</title>
<!--[if gte mso 9]>
<xml>
  <w:WordDocument>
    <w:View>Print</w:View>
    <w:Zoom>100</w:Zoom>
    <w:DoNotOptimizeForBrowser/>
  </w:WordDocument>
</xml>
<![endif]-->
<style>
  @page {
    size: A4 portrait;
    margin: 15mm 15mm 15mm 15mm;
  }
  body {
    font-family: 'Calibri', 'Arial', sans-serif;
    font-size: 10pt;
    line-height: 1.35;
    color: #17324D;
    margin: 0;
    padding: 0;
  }
  h1 {
    font-size: 14pt;
    color: #17324D;
    text-align: center;
    margin-bottom: 4px;
    font-weight: bold;
  }
  h2 {
    font-size: 12pt;
    color: #0369a1;
    text-align: center;
    margin-bottom: 12px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 12px;
    page-break-inside: avoid;
  }
  th, td {
    border: 1px solid #64748b;
    padding: 6px 8px;
    vertical-align: top;
  }
  th {
    background-color: #f1f5f9;
    font-weight: bold;
    color: #17324D;
  }
  .label-cell {
    width: 25%;
    background-color: #f8fafc;
    font-weight: bold;
  }
  .section-header {
    background-color: #e2e8f0;
    font-weight: bold;
    color: #0f172a;
    padding: 6px 8px;
  }
  .text-muted {
    color: #64748b;
    font-size: 8.5pt;
  }
</style>
</head>
<body>
  ${bodyHtml}
</body>
</html>`;

  const blob = new Blob(["\ufeff" + fullHtml], { type: WORD_MIME_TYPE });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName.endsWith(".doc") ? fileName : `${fileName}.doc`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
