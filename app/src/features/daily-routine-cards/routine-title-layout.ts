export interface RoutineTextMeasureContext { font: string; measureText(text: string): { width: number } }
export function wrapRoutineText(ctx: RoutineTextMeasureContext, value: string, width: number): string[] {
  const result: string[] = []; let line = "";
  for (const word of value.split(/\s+/u)) {
    if (ctx.measureText(word).width > width) {
      if (line) { result.push(line); line = ""; }
      for (const c of word) { if (ctx.measureText(line + c).width > width) { result.push(line); line = c; } else line += c; }
    } else if (ctx.measureText(line ? `${line} ${word}` : word).width > width) { result.push(line); line = word; }
    else line += (line ? " " : "") + word;
  }
  if (line) result.push(line); return result;
}
/** The selected minimum size is measured and kept on the same context used for drawing. */
export function fitRoutineCardTitle(ctx: RoutineTextMeasureContext, value: string, width: number, height: number, startSize: number): { fontSize: number; titleLines: string[] } {
  for (let fontSize = startSize; fontSize >= 18; fontSize -= 1) {
    ctx.font = `${fontSize}px RoutinePrint`;
    const titleLines = wrapRoutineText(ctx, value, width);
    if (titleLines.length * fontSize * 1.22 <= height) return { fontSize, titleLines };
  }
  throw new Error("Bir kart başlığı basım alanına sığmıyor. Başlığı düzenleyin veya A5 büyük kartı seçin.");
}
