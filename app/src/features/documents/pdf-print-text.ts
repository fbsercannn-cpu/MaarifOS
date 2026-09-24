/** Positions PDF text beneath the page artwork so a PDF printer retains Unicode text. */
export interface PdfPrintTextRun {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly fontSize: number;
  readonly angle: number;
  readonly direction: "ltr" | "rtl";
}

interface TextItem {
  readonly str: string;
  readonly transform: readonly number[];
  readonly width: number;
  readonly height: number;
  readonly fontName: string;
  readonly dir: string;
}
interface FontStyle { readonly ascent?: number; readonly descent?: number; readonly vertical?: boolean }

export function projectPdfPrintText(
  items: readonly (TextItem | { readonly type: string })[],
  styles: Readonly<Record<string, FontStyle>>,
  viewportTransform: readonly number[],
): readonly PdfPrintTextRun[] {
  if (viewportTransform.length !== 6 || !viewportTransform.every(Number.isFinite)) throw new Error("PDF metin koordinatları geçersiz.");
  const [a, b, c, d, e, f] = viewportTransform;
  const scale = Math.hypot(a, b);
  const runs: PdfPrintTextRun[] = [];
  for (const item of items) {
    if (!("str" in item) || !item.str) continue;
    if (item.transform.length !== 6 || !item.transform.every(Number.isFinite)) throw new Error("PDF metin konumu okunamadı.");
    const [ta, tb, tc, td, tx, ty] = item.transform;
    const fontSize = Math.hypot(a * tc + c * td, b * tc + d * td);
    const style = styles[item.fontName] ?? {};
    let angle = Math.atan2(b * ta + d * tb, a * ta + c * tb);
    if (style.vertical) angle += Math.PI / 2;
    const ascent = (style.ascent ?? (style.descent === undefined ? 0.8 : 1 + style.descent)) * fontSize;
    const width = (style.vertical ? item.height : item.width) * scale;
    const x = a * tx + c * ty + e + Math.sin(angle) * ascent;
    const y = b * tx + d * ty + f - Math.cos(angle) * ascent;
    if (![x, y, width, fontSize, angle].every(Number.isFinite) || fontSize <= 0 || width < 0) throw new Error("PDF metin ölçüsü yazdırma için geçersiz.");
    if (width === 0) continue;
    runs.push({ text: item.str, x, y, width, fontSize, angle, direction: item.dir === "rtl" ? "rtl" : "ltr" });
  }
  return runs;
}
