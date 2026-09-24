/**
 * DevelopmentSummaryForFamily.tsx � 0.49.0
 *
 * Donem sonu her cocuk icin sade aile PDF'i.
 * Teknik TYMM dili yok. "Bu donem sunlari yapti" formati.
 * Cikti: tarayici print dialog'u uzerinden PDF.
 */
import { useState } from "react";

export interface FamilyDevelopmentEntry {
  readonly domain: string; // orn. "Dil Gelisimi"
  readonly achievement: string; // orn. "Hikaye anlatti ve sorulara yanit verdi"
}

export interface DevelopmentSummaryForFamilyProps {
  readonly studentName: string;
  readonly teacherName: string;
  readonly classroomName: string;
  readonly schoolName: string;
  readonly termLabel: string; // orn. "1. Donem 2026-2027"
  readonly entries: readonly FamilyDevelopmentEntry[];
  readonly teacherNote?: string;
  readonly disabled?: boolean;
}

function buildPrintHtml(props: DevelopmentSummaryForFamilyProps): string {
  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<title>${props.studentName} � Donem Ozeti</title>
<style>
  @page { size: A4; margin: 20mm; }
  body { font-family:'Inter',Arial,sans-serif; font-size: 11pt; color: #1a2a4a; }
  .header { text-align: center; border-bottom: 2px solid #1a2a4a; padding-bottom: 12px; margin-bottom: 24px; }
  .header h1 { font-size: 16pt; margin: 0 0 4px; }
  .header p { font-size: 10pt; color: #555; margin: 0; }
  h2 { font-size: 12pt; color: #00695c; margin: 20px 0 6px; }
  .entry { margin-bottom: 10px; break-inside: avoid; }
  .entry strong { display: block; font-size: 10pt; }
  .entry span { font-size: 10.5pt; }
  .note { background: #f0f9f7; border-left: 3px solid #00897b; padding: 10px 14px; margin-top: 24px; font-size: 10pt; }
  .footer { margin-top: 32px; font-size: 9pt; color: #777; border-top: 1px solid #ddd; padding-top: 8px; display: flex; justify-content: space-between; }
  .signature { margin-top: 48px; border-top: 1px solid #333; width: 220px; padding-top: 4px; font-size: 9pt; }
</style>
</head>
<body>
<div class="header">
  <h1>${props.studentName}</h1>
  <p>${props.termLabel} &bull; ${props.classroomName} &bull; ${props.schoolName}</p>
</div>
${props.entries.map((e) => `
<div class="entry">
  <strong>${e.domain}</strong>
  <span>${e.achievement}</span>
</div>`).join("")}
${props.teacherNote ? `<div class="note">${props.teacherNote}</div>` : ""}
<div class="footer">
  <span>${props.schoolName}</span>
  <span>${new Date().toLocaleDateString("tr-TR")}</span>
</div>
<div class="signature">
  <p>${props.teacherName}</p>
  <p>Okul Oncesi Ogretmeni</p>
</div>
</body>
</html>`;
}

export function DevelopmentSummaryForFamily(props: DevelopmentSummaryForFamilyProps) {
  const [printed, setPrinted] = useState(false);

  function handlePrint() {
    const html = buildPrintHtml(props);
    const win = window.open("", "_blank", "width=794,height=1123");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); setPrinted(true); }, 400);
  }

  return (
    <section className="dev-summary-family" aria-label="Aile icin Gelisim Ozeti">
      <header>
        <h2>{props.studentName} � Donem Gelisim Ozeti</h2>
        <p>{props.termLabel}</p>
      </header>

      <ol className="dsf__entries">
        {props.entries.map((entry, i) => (
          <li key={i} className="dsf__entry">
            <strong>{entry.domain}</strong>
            <span>{entry.achievement}</span>
          </li>
        ))}
      </ol>

      {props.teacherNote && (
        <blockquote className="dsf__note">
          <p>{props.teacherNote}</p>
        </blockquote>
      )}

      <div className="dsf__actions">
        <button
          type="button"
          className="dsf__print-btn"
          onClick={handlePrint}
          disabled={props.disabled}
        >
          {printed ? "Tekrar Yazdir" : "PDF Olarak Yazdir"}
        </button>
      </div>
    </section>
  );
}
