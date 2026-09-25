import { routineCardTimes, type DailyRoutineCardRecord } from "../../core/domain/daily-routine-cards.ts";
import type { PdfPreviewRecipe } from "../documents/pdf-preview-model.ts";
import { routineIconColors, routineIconPaths } from "./routine-icons.tsx";
import { fitRoutineCardTitle, wrapRoutineText as lines } from "./routine-title-layout.ts";
const mm = (n: number) => n * 72 / 25.4;
let fontReady: Promise<FontFace> | undefined;
async function font() { fontReady ??= new FontFace("RoutinePrint", "url(/assets/fonts/MaarifOSSans-Regular.ttf)").load().then(f => { document.fonts.add(f); return f; }).catch(e => { fontReady = undefined; throw e; }); await fontReady; }
export function dailyRoutinePdfRecipe(record: DailyRoutineCardRecord, classroomName: string): PdfPreviewRecipe {
  const saved = structuredClone(record);
  return { title: "Görsel günlük rutin kartları", description: "Kayıtlı sürümden üretilir. A4: sayfada altı kart. A5: her sayfada bir büyük kart. Kesik çizgiler kesim sınırıdır; metin ve çizim iç payda kalır.", fields: [{ id: "cards", label: "Kartlar ve başlıklar" }, { id: "times", label: "Bilinen saatler ve süreler" }], templates: [{ id: "a4", label: "A4 · Altı kart" }, { id: "a5", label: "A5 · Tek büyük kart" }], initial: { fields: ["cards", "times"], template: "a4" }, async build(selection) {
    if (!selection.fields.includes("cards")) throw new Error("Kartlar ve başlıklar bölümü seçilmelidir.");
    await font(); const { PDFDocument } = await import("pdf-lib"); const pdf = await PDFDocument.create(); pdf.setTitle(saved.workflow.title); pdf.setLanguage("tr-TR"); pdf.setCreator("MaarifOS"); pdf.setCreationDate(new Date(saved.createdAt)); pdf.setModificationDate(new Date(saved.createdAt));
    const a5 = selection.template === "a5", size = a5 ? [148, 210] : [210, 297], width = a5 ? 874 : 1240, height = a5 ? 1240 : 1754, pageCapacity = a5 ? 1 : 6;
    const cards = routineCardTimes(saved.workflow).filter(c => c.card.visible);
    for (let offset = 0; offset < cards.length; offset += pageCapacity) {
      const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height; const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Kart çizim alanı hazırlanamadı.");
      ctx.fillStyle = "white"; ctx.fillRect(0, 0, width, height); ctx.fillStyle = "#173a3b"; ctx.font = `24px RoutinePrint`; ctx.textAlign = "left";
      const header = lines(ctx, `${saved.workflow.title} · ${classroomName} · ${saved.workflow.dayMode === "short" ? "Kısa gün" : "Tam gün"} · ${saved.workflow.routineOn.split("-").reverse().join(".")}`, width - 90); header.forEach((line, i) => ctx.fillText(line, 45, 38 + i * 28));
      const top = 45 + header.length * 28, gap = 24, margin = 45, columns = a5 ? 1 : 2, rows = a5 ? 1 : 3, cardWidth = (width - margin * 2 - gap * (columns - 1)) / columns, cardHeight = (height - top - 55 - gap * (rows - 1)) / rows;
      cards.slice(offset, offset + pageCapacity).forEach((item, i) => {
        const x = margin + i % columns * (cardWidth + gap), y = top + Math.floor(i / columns) * (cardHeight + gap), pad = a5 ? 38 : 26;
        ctx.save(); ctx.strokeStyle = "#647475"; ctx.lineWidth = 1.5; ctx.setLineDash([8, 7]); ctx.strokeRect(x, y, cardWidth, cardHeight); ctx.setLineDash([]); ctx.fillStyle = "#f6f9f7"; ctx.fillRect(x + 9, y + 9, cardWidth - 18, cardHeight - 18);
        ctx.fillStyle = "#365856"; ctx.font = `${a5 ? 38 : 24}px RoutinePrint`; ctx.textAlign = "left"; ctx.fillText(`${offset + i + 1}`, x + pad, y + pad + 22);
        const iconSize = a5 ? 325 : 158, iconX = x + (cardWidth - iconSize) / 2, iconY = y + (a5 ? 110 : 64); ctx.save(); ctx.translate(iconX, iconY); ctx.scale(iconSize / 100, iconSize / 100); ctx.strokeStyle = routineIconColors[item.card.icon]; ctx.lineWidth = 4.5; ctx.lineCap = "round"; ctx.lineJoin = "round"; for (const p of routineIconPaths[item.card.icon]) ctx.stroke(new Path2D(p)); ctx.restore();
        const titleTop = iconY + iconSize + (a5 ? 58 : 26), available = y + cardHeight - titleTop - (a5 ? 150 : 84), maxWidth = cardWidth - pad * 2;
        const { fontSize, titleLines } = fitRoutineCardTitle(ctx, item.card.title, maxWidth, available, a5 ? 58 : 34);
        ctx.textAlign = "center"; ctx.fillStyle = "#143936"; titleLines.forEach((line, j) => ctx.fillText(line, x + cardWidth / 2, titleTop + fontSize + j * fontSize * 1.22));
        const details = [selection.fields.includes("times") ? (item.startTime && item.endTime ? `${item.startTime}–${item.endTime}` : item.card.durationMinutes ? `${item.card.durationMinutes} dakika` : "") : "", item.card.status === "optional" ? "İsteğe bağlı" : item.card.status === "skipped" ? "Akışta atlandı" : ""].filter(Boolean);
        ctx.font = `${a5 ? 30 : 21}px RoutinePrint`; details.forEach((line, j) => ctx.fillText(line, x + cardWidth / 2, y + cardHeight - pad - (details.length - 1 - j) * (a5 ? 40 : 27))); ctx.restore();
      });
      ctx.textAlign = "right"; ctx.fillStyle = "#526967"; ctx.font = "17px RoutinePrint"; ctx.fillText(`${saved.workflow.source ? "Kayıtlı günlük akıştan düzenlendi" : "Öğretmenin düzenlediği kartlar"} · ${Math.floor(offset / pageCapacity) + 1}/${Math.ceil(cards.length / pageCapacity)}`, width - 45, height - 20);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error("Kart resmi hazırlanamadı.")), "image/png")); const png = await pdf.embedPng(await blob.arrayBuffer()); const page = pdf.addPage([mm(size[0]!), mm(size[1]!)]); page.drawImage(png, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });
    }
    return { bytes: await pdf.save(), mimeType: "application/pdf", fileName: `gunluk-rutin-${saved.workflow.routineOn}-${saved.workflow.dayMode}-${a5 ? "A5" : "A4"}.pdf` };
  } };
}
