import {
  ACTIVITY_STUDIO_AGE_LABELS,
  ACTIVITY_STUDIO_CATEGORY_LABELS,
  type ActivityStudioAgeBand,
  type ActivityStudioItem,
} from "./activity-studio-model.ts";

export interface ActivityStudioPrintable {
  readonly fileName: string;
  readonly mimeType: "text/html;charset=utf-8";
  readonly html: string;
  readonly license: "CC BY 4.0";
  readonly contentOrigin: "MaarifOS-original";
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function printableBody(activity: ActivityStudioItem): string {
  switch (activity.printableKind) {
    case "story-board":
      return `
        <section aria-labelledby="work-title">
          <h2 id="work-title">Hikâyemi çiziyorum</h2>
          <div class="three-column">
            <div class="work-box"><strong>Başlangıç</strong><span>Buraya çiz.</span></div>
            <div class="work-box"><strong>Sonra</strong><span>Buraya çiz.</span></div>
            <div class="work-box"><strong>Sonunda</strong><span>Buraya çiz.</span></div>
          </div>
          <p class="writing-line">Çocuğun sözü:</p>
        </section>`;
    case "color-exploration":
      return `
        <section aria-labelledby="work-title">
          <h2 id="work-title">Renk ve iz alanım</h2>
          <div class="two-column">
            <div class="work-box work-box--large"><strong>Birinci denemem</strong></div>
            <div class="work-box work-box--large"><strong>Değiştirip yeniden denedim</strong></div>
          </div>
          <p class="writing-line">Seçtiğim renk veya iz:</p>
        </section>`;
    case "cut-and-sort":
      return `
        <section aria-labelledby="work-title">
          <h2 id="work-title">Kes, seç ve yerleştir</h2>
          <p class="safety-note"><strong>Yetişkin:</strong> Makas kullanımını yaşa ve çocuğun ihtiyacına göre yakından destekleyin.</p>
          <div class="cut-row" aria-label="Kesilecek boş kartlar">
            <div>Seçenek 1</div><div>Seçenek 2</div><div>Seçenek 3</div>
          </div>
          <div class="work-box work-box--large"><strong>Seçtiklerimi buraya yerleştiriyorum</strong></div>
        </section>`;
    case "movement-cards":
      return `
        <section aria-labelledby="work-title">
          <h2 id="work-title">Hareket kartlarım</h2>
          <div class="three-column">
            <div class="action-card"><strong>Yavaş</strong><span>Kendi güvenli hareketini seç.</span></div>
            <div class="action-card"><strong>Dur ve dinle</strong><span>Bedeninin sinyalini fark et.</span></div>
            <div class="action-card"><strong>Yön değiştir</strong><span>Uygun alanı yetişkinle kontrol et.</span></div>
          </div>
          <p class="writing-line">Grubun önerdiği başka hareket:</p>
        </section>`;
    case "nature-log":
      return `
        <section aria-labelledby="work-title">
          <h2 id="work-title">Gözlem günlüğüm</h2>
          <div class="two-column">
            <div class="work-box work-box--large"><strong>Gördüğümü çiziyorum</strong></div>
            <div class="work-box work-box--large"><strong>Değişeni çiziyorum</strong></div>
          </div>
          <p class="writing-line">Çocuğun sorusu:</p>
          <p class="writing-line">Birlikte fark ettiğimiz:</p>
        </section>`;
    case "material-design":
      return `
        <section aria-labelledby="work-title">
          <h2 id="work-title">Materyal tasarım planım</h2>
          <div class="three-column">
            <div class="action-card"><strong>Seç</strong><span>Hangi güvenli malzemeler?</span></div>
            <div class="action-card"><strong>Dene</strong><span>İlk küçük adım ne?</span></div>
            <div class="action-card"><strong>Değiştir</strong><span>Neyi başka türlü deneyebiliriz?</span></div>
          </div>
          <div class="work-box work-box--large"><strong>Tasarımımı buraya çiziyorum</strong></div>
        </section>`;
    case "activity-sheet":
    default:
      return `
        <section aria-labelledby="work-title">
          <h2 id="work-title">Etkinlik akışım</h2>
          <ol class="flow-list">
            <li>Hazırlık ve güvenli alan</li>
            <li>Çocuğun seçimi</li>
            <li>Birlikte uygulama</li>
            <li>Çocuğun sözü ve öğretmen notu</li>
          </ol>
          <div class="work-box work-box--large"><strong>Çizim veya kısa not alanı</strong></div>
        </section>`;
  }
}

/**
 * İnternet, betik, uzak yazı tipi veya izleyici içermeyen özgün A4 HTML üretir.
 * Şablon bir resmî MEB etkinliği değil, öğretmenin düzenleyebileceği sınıf
 * materyalidir.
 */
export function renderActivityStudioPrintable(
  activity: ActivityStudioItem,
  ageBand: ActivityStudioAgeBand,
): ActivityStudioPrintable {
  if (!activity.ageBands.includes(ageBand)) {
    throw new Error(
      `${activity.title} etkinliği ${ACTIVITY_STUDIO_AGE_LABELS[ageBand]} için tanımlı değil.`,
    );
  }

  const title = escapeHtml(activity.title);
  const ageLabel = escapeHtml(ACTIVITY_STUDIO_AGE_LABELS[ageBand]);
  const category = escapeHtml(
    ACTIVITY_STUDIO_CATEGORY_LABELS[activity.category],
  );
  const adaptation = escapeHtml(activity.ageAdaptations[ageBand] ?? "");
  const materials = activity.materials.map(escapeHtml).join(", ");
  const domains = activity.tymmDomains.map(escapeHtml).join(", ");

  const html = `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} — ${ageLabel}</title>
  <style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    html { background: #edf2f0; }
    body { max-width: 210mm; min-height: 297mm; margin: 8mm auto; padding: 14mm; color: #0b2a55; background: #fff; box-shadow: 0 2mm 12mm rgb(20 45 38 / .15); font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.45; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    header { padding-bottom: 10mm; border-bottom: 2px solid #237f75; }
    h1 { margin: 0 0 3mm; font-size: 22pt; }
    h2 { margin: 8mm 0 4mm; font-size: 15pt; }
    p { margin: 2mm 0; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm 8mm; margin-top: 5mm; }
    .meta p { padding-bottom: 2mm; border-bottom: 1px solid #b7c5d5; }
    .teacher-note { margin-top: 5mm; padding: 4mm; background: #f2f8f6; border: 1px solid #bfded8; }
    .three-column, .two-column { display: grid; gap: 4mm; }
    .three-column { grid-template-columns: repeat(3, 1fr); }
    .two-column { grid-template-columns: repeat(2, 1fr); }
    .work-box, .action-card { min-height: 52mm; padding: 4mm; border: 1.5px solid #6d7f93; }
    .work-box--large { min-height: 82mm; }
    .work-box span, .action-card span { display: block; margin-top: 3mm; color: #526273; font-size: 9pt; }
    .cut-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; margin: 4mm 0 8mm; }
    .cut-row div { min-height: 28mm; padding: 4mm; border: 1.5px dashed #6d7f93; text-align: center; }
    .writing-line { min-height: 12mm; padding-top: 4mm; border-bottom: 1px solid #6d7f93; }
    .flow-list { display: grid; gap: 3mm; padding-left: 8mm; }
    .safety-note { padding: 3mm; border-left: 3px solid #a76415; background: #fff8ed; }
    footer { margin-top: 8mm; padding-top: 4mm; color: #526273; border-top: 1px solid #b7c5d5; font-size: 8.5pt; }
    section, .teacher-note, .work-box, .action-card, .cut-row { break-inside: avoid; page-break-inside: avoid; }
    @media screen and (max-width: 600px) {
      html { background: #fff; }
      body { width: 100%; min-height: 0; margin: 0; padding: 16px; box-shadow: none; font-size: 15px; line-height: 1.55; }
      header { padding-bottom: 20px; }
      h1 { font-size: 28px; line-height: 1.12; overflow-wrap: anywhere; }
      h2 { margin: 28px 0 14px; font-size: 21px; }
      .meta { grid-template-columns: minmax(0, 1fr); gap: 4px; margin-top: 16px; }
      .meta p { margin: 0; padding: 8px 0; }
      .teacher-note { margin-top: 16px; padding: 12px; }
      .three-column, .two-column, .cut-row { grid-template-columns: minmax(0, 1fr); gap: 12px; }
      .work-box, .action-card { min-height: 170px; padding: 14px; }
      .work-box--large { min-height: 230px; }
      .cut-row div { min-height: 110px; padding: 14px; }
      .writing-line { min-height: 58px; padding-top: 14px; }
      footer { margin-top: 28px; padding-top: 14px; line-height: 1.5; }
    }
    @media print {
      html { background: #fff; }
      body { width: auto; min-height: auto; margin: 0; padding: 0; box-shadow: none; }
    }
  </style>
</head>
<body>
  <header>
    <p>MaarifOS Etkinlik ve Materyal Stüdyosu</p>
    <h1>${title}</h1>
    <div class="meta">
      <p><strong>Yaş:</strong> ${ageLabel}</p>
      <p><strong>Tür:</strong> ${category}</p>
      <p><strong>Süre:</strong> ${activity.durationMinutes} dakika</p>
      <p><strong>Ortam:</strong> ${escapeHtml(activity.environment)}</p>
      <p><strong>TYMM alanı:</strong> ${domains}</p>
      <p><strong>Malzeme:</strong> ${materials}</p>
    </div>
    <p class="teacher-note"><strong>Yaşa göre kolaylaştırma:</strong> ${adaptation}</p>
  </header>
  ${printableBody(activity)}
  <footer>
    MaarifOS tarafından özgün hazırlanmıştır; resmî MEB etkinliği veya değerlendirme aracı değildir.
    Creative Commons Attribution 4.0 (CC BY 4.0) ile paylaşılır. Çocuk çalışması puanlanmaz.
  </footer>
</body>
</html>`;

  return Object.freeze({
    fileName: `maarifos-${activity.id}-${ageBand}.html`,
    mimeType: "text/html;charset=utf-8",
    html,
    license: "CC BY 4.0",
    contentOrigin: "MaarifOS-original",
  });
}
