/**
 * T.C. Hazine ve Maliye Bakanlığı & Gelir İdaresi Başkanlığı Standartları
 * Resmî MEB TTKB Formları 4'lü Dışa Aktarma Servisi (Quad-Export Engine)
 * Mimari: %100 Client-Side, Sıfır Harici API, Native OpenXML (.xlsx), Direct PDF, A4 Paged Media & Word
 */

import { prepareOfficialFormExport } from "./official-form-session.ts";
import { canonicalJson } from "../../core/backup/canonical-json.ts";
import { sha256Hex } from "../../core/backup/crypto.ts";
import { createOfficialFormDocx, type OfficialWordBlock } from "./official-form-docx.ts";
import { downloadBrowserFile } from "../documents/browser-file-download.ts";

export const XLSX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" as const;
export const WORD_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document" as const;

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
  const source = await prepareOfficialFormExport();
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

  if (source) {
    const provenance = x.utils.aoa_to_sheet([["Kaynak kayıt", source.id], ["Sürüm", source.revision], ["SHA-256", await sha256Hex(canonicalJson(source))]]);
    x.utils.book_append_sheet(wb, provenance, "Kaynak");
  }
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
    await prepareOfficialFormExport();
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
export async function printOfficialFormA4(documentTitle: string): Promise<void> {
  if (typeof document === "undefined") return;

  try { await prepareOfficialFormExport(); } catch (error) { window.alert(error instanceof Error ? error.message : "Kayıt tamamlanmadı; çıktı hazırlanmadı."); return; }

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
  clone.querySelectorAll(".print-only-text").forEach(node => node.remove());

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
      displayVal = orig.value || "";
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
  try {
    const rawLic = localStorage.getItem("maarifos_commercial_license_v1");
    const isPro = rawLic && JSON.parse(rawLic).tier && JSON.parse(rawLic).tier !== "trial";
    if (!isPro) {
      const trialNotice = document.createElement("div");
      trialNotice.className = "maarif-print-trial-notice";
      trialNotice.style.cssText =
        "margin-top: 14px; padding: 6px 12px; border: 1px dashed #d97706; background: #fffbeb; color: #92400e; font-size: 7.5pt; text-align: center; border-radius: 4px; font-weight: 700;";
      trialNotice.textContent =
        "⚠️ MAARİF OS · ÜCRETSİZ DENEME SÜRÜMÜ — Resmî antetli, teftişe tam hazır ve filigransız MEB çıktısı için Pro Lisans edininiz: www.maarifos.com";
      clone.appendChild(trialNotice);
    }
  } catch {
    // Graceful degradation
  }

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

/** Capture visible fields once after their canonical revision is durably stored. */
export function cloneOfficialFormForOutput(target: HTMLElement): HTMLElement {
  const clone = target.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(".print-only-text").forEach(node => node.remove());
  const copies = clone.querySelectorAll("input,textarea,select");
  target.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input,textarea,select").forEach((control, i) => {
    const copy = copies[i]; if (!copy) return;
    const replacement = document.createElement("span");
    replacement.textContent = control instanceof HTMLSelectElement ? control.selectedOptions[0]?.textContent ?? "" : control instanceof HTMLInputElement && ["checkbox", "radio"].includes(control.type) ? control.checked ? "✓" : "" : control.value;
    replacement.style.whiteSpace = "pre-wrap";
    copy.replaceWith(replacement);
  });
  clone.querySelectorAll("button, .no-print, .print-hidden, .official-form-actions, .of-actions-bar, dialog, script, style").forEach(node => node.remove());
  return clone;
}
function collectWordBlocks(root: HTMLElement): OfficialWordBlock[] {
  const blocks: OfficialWordBlock[] = [];
  const readText = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
    if (!(node instanceof Element)) return "";
    if (node.tagName === "BR") return "\n";
    const content = Array.from(node.childNodes).map(readText).join("");
    const line = ["DIV", "P", "LABEL", "LI"].includes(node.tagName) || (node instanceof HTMLElement && node.style.whiteSpace === "pre-wrap");
    return line ? `\n${content}\n` : content;
  };
  const walk = (node: Element) => {
    if (node.tagName === "TABLE") {
      const element = node as HTMLTableElement;
      const domRows = Array.from(element.rows);
      const rows = domRows.map(row => Array.from(row.cells).map(cell => ({ text: readText(cell).replace(/\n[ \t]*\n/g, "\n").trim(), colSpan: cell.colSpan, rowSpan: cell.rowSpan, header: cell.tagName === "TH" })));
      const columns = Math.max(1, ...rows.map(row => row.reduce((sum, cell) => sum + cell.colSpan, 0)));
      const completeRow = domRows.find(row => row.cells.length === columns && Array.from(row.cells).every(cell => cell.colSpan === 1));
      let columnWeights: number[] | undefined;
      if (completeRow) {
        const logicalWidth = Math.max(850, Number.parseFloat(element.style.minWidth) || 0, Number.parseFloat(element.closest<HTMLElement>(".official-form-container")?.style.maxWidth || "") || 0);
        const widths = Array.from(completeRow.cells).map(cell => cell.style.width.endsWith("%") ? Number.parseFloat(cell.style.width) / 100 : (Number.parseFloat(cell.style.width) || 0) / logicalWidth);
        const specified = widths.reduce((sum, value) => sum + value, 0);
        const missing = widths.filter(value => !value).length;
        if (specified > 0) columnWeights = widths.map(value => value || Math.max(0.05, (1 - specified) / Math.max(1, missing)));
        else if (columns === 4 && completeRow.cells[0].tagName === "TH" && completeRow.cells[2].tagName === "TH") columnWeights = [18, 34, 20, 28];
        else if (columns === 2 && completeRow.cells[0].tagName === "TH") columnWeights = [32, 68];
      }
      if (rows.length) blocks.push({ kind: "table", rows, columnWeights, headerRows: element.tHead?.rows.length || 0 });
    } else if (["P", "H1", "H2", "H3", "H4", "LI", "LABEL"].includes(node.tagName) || !node.children.length) {
      const text = node.textContent?.trim(); if (text) blocks.push({ kind: "paragraph", text });
    } else {
      for (const child of node.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) { const text = child.textContent?.trim(); if (text) blocks.push({ kind: "paragraph", text }); }
        else if (child instanceof Element) walk(child);
      }
    }
  };
  walk(root); return blocks;
}
export async function downloadOfficialFormWord(fileName = "Resmi_Form"): Promise<void> {
  try {
    const source = await prepareOfficialFormExport();
    const target = document.querySelector<HTMLElement>(".official-workspace-body .official-a4-sheet, .official-workspace-body .official-sheet, .official-workspace-body .official-print-document, .official-form-modal .official-a4-sheet, .official-form-modal .official-sheet, .official-form-container");
    if (!target) throw new Error("Çıktısı hazırlanacak belge bulunamadı.");
    const clone = cloneOfficialFormForOutput(target);
    const title = target.querySelector("h1,h2,h3")?.textContent?.trim() || fileName;
    const provenance = source ? `MaarifOS kayıt ${source.id}; sürüm ${source.revision}; SHA-256 ${await sha256Hex(canonicalJson(source))}` : "MaarifOS başvuru belgesi; kayıtlı çocuk değerlendirmesi içermez.";
    const bytes = createOfficialFormDocx(title, collectWordBlocks(clone), provenance, target.classList.contains("is-landscape") || target.querySelector(".is-landscape") !== null);
    downloadBrowserFile({bytes, mimeType: WORD_MIME_TYPE, fileName: fileName.replace(/\.docx?$/i, "") + ".docx"});
  } catch (error) { window.alert(error instanceof Error ? error.message : "Word çıktısı hazırlanamadı."); }
}
/** Compatibility entry: output uses the durable active form, never interpolated HTML. */
export async function exportOfficialFormToWord(fileName: string, _title: string, _bodyHtml: string): Promise<void> {
  await downloadOfficialFormWord(fileName);
}
