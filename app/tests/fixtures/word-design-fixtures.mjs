import { readFile } from "node:fs/promises";
import { createPremiumPlanDocx } from "../../src/features/premium-plans/export-document.ts";
import { createMonthlyEvaluationDocx } from "../../src/features/premium-plans/monthly-evaluation-export.ts";
import { createAnecdoteDocx } from "../../src/features/anecdote/export-document.ts";

export function readDocxParts(bytes) {
  const parts = new Map(), view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let at = 0; at + 30 < bytes.length && view.getUint32(at, true) === 0x04034b50;) {
    const size = view.getUint32(at + 18, true), length = view.getUint16(at + 26, true), extra = view.getUint16(at + 28, true), start = at + 30 + length + extra;
    parts.set(new TextDecoder().decode(bytes.slice(at + 30, at + 30 + length)), new TextDecoder().decode(bytes.slice(start, start + size)));
    at = start + size;
  }
  return parts;
}

export async function wordDesignFixtures() {
  const raw = "Kurgu çocuk iki kaba aynı miktarda su koydu. İnce kabı gösterip ‘Burada daha yukarıda’ dedi. Öğretmenin sorusundan sonra iki kabı yan yana getirerek yeniden inceledi.";
  const anecdote = { workflowStatus: "ready", missingFields: [], childFullName: "Kurgu Deniz Yılmaz", civilDate: "2026-09-10", observedLocation: "Sınıf fen ve keşif merkezi", observedSituation: raw, observedSkills: [{ referenceCode: "FAB.1", referenceTitle: "Gözlem yapabilme" }], observerGeneralAssessment: "Çocuğun kap biçimi ile görünen su seviyesi arasındaki ilişkiyi incelemesini desteklemek için aynı hacimde farklı kaplar sunulacak. Yeni gözlemde yaptığı karşılaştırma ve kendi sözü ayrı kaydedilecek.", observationId: "00000000-0000-4000-8000-000000099901", programSourceVersions: ["2024"] };
  const ek18 = JSON.parse(await readFile(new URL("../../scripts/document-acceptance/fixtures/ek18-document.json", import.meta.url), "utf8"));
  const paragraphs = [
    { text: "Eylül ayı öğretmen çalışma planı", style: "title" },
    { text: "Kurgu Güneş Sınıfı · 2026–2027 · 14–18 Eylül 2026", style: "meta" },
    { text: "Bu plan sınıfta uygulanacak etkinlikleri, hazırlanacak materyalleri ve sonraki gözlem adımlarını bir arada gösterir.", style: "body" },
    { text: "Haftanın hazırlığı", style: "heading1" },
    { text: "Öğretmenin hazırladığı materyaller", style: "heading2" },
    ...["Farklı boylarda kaplar ve su tepsisi", "Çocukların çizimlerini yerleştireceği pano", "Ortak oyun için büyük bloklar"].map(text => ({ text, style: "bullet" })),
    { text: "Gözlem ve sonraki adım", style: "heading1" },
    ...Array.from({ length: 15 }, (_, i) => ({ text: `${i + 1}. gün kaydı · ${raw} Çocuğun sözü, öğretmen yorumu ve sonraki plan birbirinden ayrı tutulacak.`, style: "body" })),
  ];
  return [
    { name: "ogretmen-plani.docx", bytes: createPremiumPlanDocx(paragraphs), raw },
    { name: "anekdot-formu.docx", bytes: createAnecdoteDocx(anecdote, { exportedAt: "2026-09-10T09:00:00.000Z" }), raw },
    { name: "ek18-aylik-degerlendirme.docx", bytes: createMonthlyEvaluationDocx(ek18), raw: "EK 18 : AYLIK PLAN KONTROL ÇİZELGESİ" },
  ];
}
