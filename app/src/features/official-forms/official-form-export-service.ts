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
/**
 * A4 CSS Paged Media doğrudan yazdırma motoru (Bulletproof DOM Isolation Engine).
 * Sayfadaki resmî belge elementini (#maarif-print-container) izole bir print container'a aktarır.
 * body.is-printing-official-a4 sınıfı ile ana SPA kabuğu, arka plan çalışma alanı,
 * alt navigasyon çubuğu (.bottom-nav) ve tüm gereksiz DOM ağacı @media print'te display: none yapılır.
 * Chromium iframe clipping veya opacity:0 beyaz sayfa hatası %0 ihtimale indirgenir.
 */
export function printOfficialFormA4(documentTitle: string): void {
  if (typeof document === "undefined") return;

  // 1. Hedef Belge Elemanını Bul (Önce aktif overlay/modal içinde ara)
  const activeWorkspace = document.querySelector<HTMLElement>(
    ".official-workspace-overlay, .official-form-modal",
  );

  let targetElement: HTMLElement | null = null;
  if (activeWorkspace) {
    targetElement =
      activeWorkspace.querySelector<HTMLElement>(
        ".official-a4-sheet, .official-sheet, .official-print-document",
      ) ||
      activeWorkspace.querySelector<HTMLElement>(
        ".official-form-container, .a4-printable, [data-printable='true']",
      );
  }

  if (!targetElement) {
    targetElement =
      document.querySelector<HTMLElement>(
        ".official-workspace-body .official-sheet, .official-workspace-body .official-a4-sheet, .official-workspace-body .official-print-document",
      ) ||
      document.querySelector<HTMLElement>(
        ".official-sheet, .official-a4-sheet, .official-print-document",
      ) ||
      document.querySelector<HTMLElement>(
        ".official-workspace-body .official-form-container, .official-form-modal .official-form-container, .official-form-container, .a4-printable, [data-printable='true']",
      );
  }

  if (!targetElement) {
    window.print();
    return;
  }

  // 2. Yatay belge tespiti (EK-15, Sınıf Beceri Matrisi vb.)
  const isLandscape =
    targetElement.classList.contains("is-landscape") ||
    targetElement.querySelector(".is-landscape") !== null ||
    documentTitle.toLowerCase().includes("ek-15") ||
    documentTitle.toLowerCase().includes("matris") ||
    documentTitle.toLowerCase().includes("cizelge") ||
    documentTitle.toLowerCase().includes("kontrolleri");

  // 3. Klonla ve Form Elemanlarını Salt Metne Dönüştür
  const clone = targetElement.cloneNode(true) as HTMLElement;

  const originalControls = targetElement.querySelectorAll<
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  >("input, textarea, select");
  const cloneControls = clone.querySelectorAll<
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  >("input, textarea, select");

  originalControls.forEach((orig, idx) => {
    const cloned = cloneControls[idx];
    if (!cloned) return;

    let displayVal = "";
    if (orig instanceof HTMLSelectElement) {
      displayVal = orig.options[orig.selectedIndex]?.text || orig.value || "";
    } else if (orig instanceof HTMLInputElement && orig.type === "checkbox") {
      displayVal = orig.checked ? "✓" : "";
    } else {
      displayVal = orig.value || orig.placeholder || "";
    }

    const span = document.createElement("span");
    span.className = "print-only-text";
    span.textContent = displayVal;
    span.style.cssText =
      "display: block !important; white-space: pre-wrap !important; word-break: break-word !important; color: #000000 !important;";

    cloned.parentNode?.replaceChild(span, cloned);
  });

  // Klon içerisinden butonları, aksiyon çubuklarını ve no-print alanları kaldır
  clone
    .querySelectorAll(
      "button, .official-form-actions, .of-actions-bar, .no-print, .print-hidden, .official-workspace-header, .tab-page-tag",
    )
    .forEach((el) => el.remove());

  // 4. Dedicated Print Container Yönetimi
  let printContainer = document.getElementById("maarif-print-container");
  if (!printContainer) {
    printContainer = document.createElement("div");
    printContainer.id = "maarif-print-container";
    document.body.appendChild(printContainer);
  }
  printContainer.replaceChildren();
  printContainer.appendChild(clone);

  // 5. Dinamik @page Stili Enjeksiyonu
  let styleEl = document.getElementById(
    "maarif-print-dynamic-style",
  ) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = "maarif-print-dynamic-style";
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = `
    @media print {
      @page {
        size: ${isLandscape ? "A4 landscape" : "A4 portrait"} !important;
        margin: 8mm 10mm 10mm 10mm !important;
      }
    }
  `;

  // 6. Başlık ve Sınıf Atama
  const previousTitle = document.title;
  document.title = documentTitle;
  document.body.classList.add("is-printing-official-a4");
  if (isLandscape) {
    document.body.classList.add("is-print-landscape");
  }

  // 7. Temizleme Fonksiyonu
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    document.body.classList.remove(
      "is-printing-official-a4",
      "is-print-landscape",
    );
    document.title = previousTitle;
    if (printContainer) {
      printContainer.replaceChildren();
    }
    if (styleEl) {
      styleEl.textContent = "";
    }
    window.removeEventListener("afterprint", cleanup);
  };

  window.addEventListener("afterprint", cleanup, { once: true });

  // 8. Tetikleme (DOM render sonrası güvenli zamanlama)
  window.setTimeout(() => {
    try {
      window.print();
    } finally {
      window.setTimeout(cleanup, 2000);
    }
  }, 100);
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
