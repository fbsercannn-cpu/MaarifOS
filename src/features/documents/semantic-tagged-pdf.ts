import { registerSemanticPdfPreview } from "./semantic-pdf-preview.ts";

const encoder = new TextEncoder();

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;

export const ACCESSIBLE_PDF_FONT_ASSET_PATH =
  "/assets/fonts/MaarifOSSans-Regular.ttf" as const;
export const ACCESSIBLE_PDF_BOLD_FONT_ASSET_PATH = "./assets/fonts/MaarifOSSans-Bold.ttf" as const;
export type SemanticPdfColor = readonly [number, number, number];
/** Opt-in presentation; an absent theme preserves the original font and PDF bytes. */
export interface SemanticPdfTheme {
  readonly bodyColor: SemanticPdfColor;
  readonly metaColor: SemanticPdfColor;
  readonly headingColor: SemanticPdfColor;
  readonly tableHeaderFill: SemanticPdfColor;
  readonly tableHeaderColor: SemanticPdfColor;
  readonly tableBorderColor: SemanticPdfColor;
  readonly tableDetailFill: SemanticPdfColor;
  readonly headerGroupFills: readonly SemanticPdfColor[];
  readonly headerGroupTints: readonly SemanticPdfColor[];
  readonly headerGroupTextColor: SemanticPdfColor;
  readonly boldHeadings?: boolean;
}

export type SemanticPdfHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type SemanticPdfNode =
  | Readonly<{
      kind: "heading";
      level: SemanticPdfHeadingLevel;
      text: string;
      pageBreakBefore?: boolean;
      forcePageBreakBefore?: boolean;
      /** Context for this independent form and its continuation pages. */
      continuationHeaderText?: string;
    }>
  | Readonly<{
      kind: "paragraph";
      text: string;
      tone?: "body" | "meta";
      pageBreakBefore?: boolean;
      forcePageBreakBefore?: boolean;
      /** A single line measured in an authored canvas/HTML page; PDF points, top-left origin. */
      placement?: Readonly<{ x: number; y: number; width: number; height: number; fontSize?: number; invisible?: boolean }>;
      /** Only explicitly supplied http(s) source addresses become clickable annotations. */
      href?: string;
    }>
  | Readonly<{
      kind: "list";
      items: readonly string[];
      ordered?: boolean;
      pageBreakBefore?: boolean;
    }>
  | Readonly<{
      kind: "table";
      headers: readonly string[];
      rows: readonly (readonly string[])[];
      summary?: string;
      /** Birleşik üst başlıklar; span toplamı yaprak sütun sayısına eşittir. */
      headerGroups?: readonly Readonly<{ label: string; span: number; colorIndex?: number }>[];
      /** Satırdan hemen sonra tam genişlikte gösterilen ayrıntı; rows ile birebir eşleşir. */
      rowDetails?: readonly (string | null)[];
      /** Sütunlara ayrılan göreli genişlikler; verilmezse sütunlar eşit genişler. */
      columnWeights?: readonly number[];
      /** Hücre iç boşluğu (pt); dar resmî matrislerde açıkça küçültülebilir. */
      cellPadding?: number;
      /** Okunabilir çizelge tipografisi; varsayılan 9 pt korunur. */
      fontSize?: number;
      /** Dar, tek sayfalık resmî çizelgelerde gövde hücrelerini ölçülü olarak en çok bu satır sayısına sığdırır. */
      fitBodyCellsWithinLines?: 1 | 2;
      /** Tek satır sığdırmada kabul edilen en küçük yatay ölçek yüzdesi. */
      minimumBodyCellHorizontalScale?: number;
      /** Çok sayfalı çizelgenin son sayfasında az satır kalmasını azaltır. */
      balancePages?: boolean;
      /** Son tablo sayfasında imza gibi sonraki içerik için ayrılan yükseklik. */
      reserveAfter?: number | "following-content";
      /** Gövde satırını ekran okuyucuya bağlayan satır başlığı sütunu. */
      rowHeaderColumn?: number;
      /** Ardışık aynı anahtarlı satırlar sığdıkları sürece birlikte kalır. */
      rowGroupColumn?: number;
      /** Yalnız bir satır tam sayfadan uzunsa devam sayfasında yinelenecek bağlam sütunları. */
      continuationContextColumns?: readonly number[];
      /** Sınıf belgelerinde devam bağlamındaki çocuk adı da kısaltılmadan yinelenir. */
      preserveContinuationContext?: boolean;
      pageBreakBefore?: boolean;
    }>
  | Readonly<{
      kind: "figure";
      altText: string;
      caption?: string;
      height?: number;
      pageBreakBefore?: boolean;
      forcePageBreakBefore?: boolean;
    }>;

export interface SemanticTaggedPdfDocument {
  readonly title: string;
  readonly theme?: SemanticPdfTheme;
  readonly orientation?: "portrait" | "landscape";
  readonly pageFormat?: "A4" | "A5";
  readonly pageMargin?: number;
  readonly language?: "tr-TR";
  readonly creator?: string;
  /** Her sayfada semantik okuma ağacının dışında gösterilen kısa güvenlik notu. */
  readonly artifactFooterText?: string;
  readonly artifactHeaderText?: string;
  readonly artifactHeaderOnFirstPage?: boolean;
  readonly includeTotalPages?: boolean;
  /** Authored image pages already contain their page furniture. */
  readonly omitPageFurniture?: boolean;
  /**
   * Yalnız teknik izlenebilirlik değerleri içindir. Görünür belge içeriği veya
   * öğrenci/veli kişisel verisi bu alana taşınmamalıdır.
   */
  readonly technicalMetadata?: readonly Readonly<{
    key: string;
    value: string;
  }>[];
  readonly nodes: readonly SemanticPdfNode[];
}

export interface SemanticTaggedPdfRuntime {
  readonly fontBytes?: Uint8Array;
  readonly loadFontBytes?: () => Promise<Uint8Array>;
  readonly boldFontBytes?: Uint8Array;
  readonly loadBoldFontBytes?: () => Promise<Uint8Array>;
}

export interface SemanticPdfFigureBox { readonly pageIndex: number; readonly x: number; readonly y: number; readonly width: number; readonly height: number; readonly altText: string; }
const figureBoxesByPdf = new WeakMap<Uint8Array, readonly SemanticPdfFigureBox[]>();
export function semanticPdfFigureBoxes(bytes: Uint8Array): readonly SemanticPdfFigureBox[] { return figureBoxesByPdf.get(bytes) ?? []; }

export interface SemanticTaggedPdfEvidence {
  readonly implementationStatus: "IMPLEMENTED_UNVERIFIED";
  readonly language: "tr-TR";
  readonly tagged: true;
  readonly embeddedFont: true;
  readonly toUnicode: true;
  readonly logicalReadingOrder: true;
  readonly alternativeTextRequired: true;
  readonly pdfUaClaimed: false;
}

export const SEMANTIC_TAGGED_PDF_EVIDENCE = Object.freeze({
  implementationStatus: "IMPLEMENTED_UNVERIFIED",
  language: "tr-TR",
  tagged: true,
  embeddedFont: true,
  toUnicode: true,
  logicalReadingOrder: true,
  alternativeTextRequired: true,
  pdfUaClaimed: false,
} satisfies SemanticTaggedPdfEvidence);

interface FontMetrics {
  readonly bytes: Uint8Array;
  readonly weight: number;
  readonly unitsPerEm: number;
  readonly ascent: number;
  readonly descent: number;
  readonly capHeight: number;
  readonly bbox: readonly [number, number, number, number];
  readonly glyphForCodePoint: ReadonlyMap<number, number>;
  readonly advanceWidths: readonly number[];
}

interface PdfObject {
  readonly id: number;
  bytes: Uint8Array;
}

interface StructElement {
  readonly role:
    | "Document"
    | `H${SemanticPdfHeadingLevel}`
    | "P"
    | "L"
    | "LI"
    | "Lbl"
    | "LBody"
    | "Table"
    | "TR"
    | "TH"
    | "TD"
    | "Figure";
  readonly children: StructElement[];
  readonly markedContent: MarkedContentReference[];
  readonly altText?: string;
  readonly tableSummary?: string;
  readonly tableHeaderScope?: "Column" | "Row";
  readonly tableColumnSpan?: number;
  objectId?: number;
  parent?: StructElement;
}

interface MarkedContentReference {
  readonly pageIndex: number;
  readonly mcid: number;
}

interface PdfPageDraft {
  readonly commands: string[];
  readonly structParents: StructElement[];
  readonly links: { uri: string; rect: readonly [number, number, number, number] }[];
  headerText?: string;
  cursorY: number;
}

interface TextStyle {
  readonly fontSize: number;
  readonly lineHeight: number;
  readonly gap: number;
  readonly color: readonly [number, number, number];
  readonly fontResource?: "F0" | "F1";
}

const HEADING_STYLES: Readonly<Record<SemanticPdfHeadingLevel, TextStyle>> = {
  1: { fontSize: 20, lineHeight: 26, gap: 12, color: [0.22, 0.14, 0.35] },
  2: { fontSize: 15, lineHeight: 20, gap: 9, color: [0.31, 0.2, 0.46] },
  3: { fontSize: 12.5, lineHeight: 17, gap: 7, color: [0.36, 0.25, 0.52] },
  4: { fontSize: 11.5, lineHeight: 16, gap: 6, color: [0.36, 0.25, 0.52] },
  5: { fontSize: 10.5, lineHeight: 15, gap: 5, color: [0.36, 0.25, 0.52] },
  6: { fontSize: 10, lineHeight: 14, gap: 5, color: [0.36, 0.25, 0.52] },
};

const BODY_STYLE: TextStyle = {
  fontSize: 10.5,
  lineHeight: 15,
  gap: 7,
  color: [0.14, 0.13, 0.15],
};

const META_STYLE: TextStyle = {
  fontSize: 9,
  lineHeight: 13,
  gap: 6,
  color: [0.42, 0.39, 0.44],
};

function joinBytes(parts: readonly Uint8Array[]): Uint8Array {
  const output = new Uint8Array(
    parts.reduce((total, part) => total + part.byteLength, 0),
  );
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.byteLength;
  }
  return output;
}

function readUint16(bytes: Uint8Array, offset: number): number {
  return (bytes[offset]! << 8) | bytes[offset + 1]!;
}

function readInt16(bytes: Uint8Array, offset: number): number {
  const value = readUint16(bytes, offset);
  return value > 0x7fff ? value - 0x10000 : value;
}

function readUint32(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset]! * 0x1000000
    + (bytes[offset + 1]! << 16)
    + (bytes[offset + 2]! << 8)
    + bytes[offset + 3]!
  );
}

function tableOffset(
  bytes: Uint8Array,
  tag: "cmap" | "head" | "hhea" | "hmtx" | "maxp" | "OS/2",
): number {
  const tableCount = readUint16(bytes, 4);
  for (let index = 0; index < tableCount; index += 1) {
    const offset = 12 + index * 16;
    const currentTag = String.fromCharCode(
      bytes[offset]!,
      bytes[offset + 1]!,
      bytes[offset + 2]!,
      bytes[offset + 3]!,
    );
    if (currentTag === tag) return readUint32(bytes, offset + 8);
  }
  throw new Error(`PDF yazı tipi ${tag} tablosunu taşımıyor.`);
}

function parseFormat4Cmap(
  bytes: Uint8Array,
  offset: number,
): Map<number, number> {
  const mapping = new Map<number, number>();
  const segmentCount = readUint16(bytes, offset + 6) / 2;
  const endCodesOffset = offset + 14;
  const startCodesOffset = endCodesOffset + segmentCount * 2 + 2;
  const idDeltaOffset = startCodesOffset + segmentCount * 2;
  const idRangeOffsetOffset = idDeltaOffset + segmentCount * 2;
  for (let segment = 0; segment < segmentCount; segment += 1) {
    const endCode = readUint16(bytes, endCodesOffset + segment * 2);
    const startCode = readUint16(bytes, startCodesOffset + segment * 2);
    const delta = readInt16(bytes, idDeltaOffset + segment * 2);
    const rangeOffsetPosition = idRangeOffsetOffset + segment * 2;
    const rangeOffset = readUint16(bytes, rangeOffsetPosition);
    if (startCode === 0xffff && endCode === 0xffff) continue;
    for (let codePoint = startCode; codePoint <= endCode; codePoint += 1) {
      let glyphId: number;
      if (rangeOffset === 0) {
        glyphId = (codePoint + delta) & 0xffff;
      } else {
        const glyphPosition = rangeOffsetPosition + rangeOffset + (codePoint - startCode) * 2;
        const rawGlyphId = readUint16(bytes, glyphPosition);
        glyphId = rawGlyphId === 0 ? 0 : (rawGlyphId + delta) & 0xffff;
      }
      if (glyphId !== 0) mapping.set(codePoint, glyphId);
    }
  }
  return mapping;
}

function parseFormat12Cmap(
  bytes: Uint8Array,
  offset: number,
): Map<number, number> {
  const mapping = new Map<number, number>();
  const groupCount = readUint32(bytes, offset + 12);
  for (let index = 0; index < groupCount; index += 1) {
    const groupOffset = offset + 16 + index * 12;
    const startCode = readUint32(bytes, groupOffset);
    const endCode = readUint32(bytes, groupOffset + 4);
    const startGlyph = readUint32(bytes, groupOffset + 8);
    for (let codePoint = startCode; codePoint <= endCode; codePoint += 1) {
      mapping.set(codePoint, startGlyph + codePoint - startCode);
    }
  }
  return mapping;
}

function parseCmap(bytes: Uint8Array, cmapOffset: number): Map<number, number> {
  const subtableCount = readUint16(bytes, cmapOffset + 2);
  const candidates: { offset: number; format: number; score: number }[] = [];
  for (let index = 0; index < subtableCount; index += 1) {
    const recordOffset = cmapOffset + 4 + index * 8;
    const platform = readUint16(bytes, recordOffset);
    const encoding = readUint16(bytes, recordOffset + 2);
    const subtableOffset = cmapOffset + readUint32(bytes, recordOffset + 4);
    const format = readUint16(bytes, subtableOffset);
    if (format !== 4 && format !== 12) continue;
    const score = format === 12 ? 100 : 50;
    const platformScore = platform === 3 && encoding === 10
      ? 20
      : platform === 3
        ? 10
        : platform === 0
          ? 5
          : 0;
    candidates.push({ offset: subtableOffset, format, score: score + platformScore });
  }
  const candidate = candidates.sort((left, right) => right.score - left.score)[0];
  if (!candidate) throw new Error("PDF yazı tipi Unicode cmap tablosunu taşımıyor.");
  return candidate.format === 12
    ? parseFormat12Cmap(bytes, candidate.offset)
    : parseFormat4Cmap(bytes, candidate.offset);
}

function parseFontMetrics(fontBytes: Uint8Array): FontMetrics {
  if (fontBytes.byteLength < 12) throw new Error("PDF yazı tipi boş veya bozuk.");
  const bytes = new Uint8Array(fontBytes);
  const head = tableOffset(bytes, "head");
  const hhea = tableOffset(bytes, "hhea");
  const hmtx = tableOffset(bytes, "hmtx");
  const maxp = tableOffset(bytes, "maxp");
  const cmap = tableOffset(bytes, "cmap");
  const os2 = tableOffset(bytes, "OS/2");
  const unitsPerEm = readUint16(bytes, head + 18);
  const glyphCount = readUint16(bytes, maxp + 4);
  const horizontalMetricCount = readUint16(bytes, hhea + 34);
  if (unitsPerEm <= 0 || glyphCount <= 0 || horizontalMetricCount <= 0) {
    throw new Error("PDF yazı tipi ölçümleri doğrulanamadı.");
  }
  const widths: number[] = [];
  for (let glyphId = 0; glyphId < glyphCount; glyphId += 1) {
    const metricIndex = Math.min(glyphId, horizontalMetricCount - 1);
    widths.push(readUint16(bytes, hmtx + metricIndex * 4));
  }
  const os2Version = readUint16(bytes, os2);
  const capHeight = os2Version >= 2 ? readInt16(bytes, os2 + 88) : readInt16(bytes, hhea + 4);
  return {
    bytes,
    weight: readUint16(bytes, os2 + 4),
    unitsPerEm,
    ascent: readInt16(bytes, hhea + 4),
    descent: readInt16(bytes, hhea + 6),
    capHeight,
    bbox: [
      readInt16(bytes, head + 36),
      readInt16(bytes, head + 38),
      readInt16(bytes, head + 40),
      readInt16(bytes, head + 42),
    ],
    glyphForCodePoint: parseCmap(bytes, cmap),
    advanceWidths: widths,
  };
}

function codePoints(value: string): number[] {
  return [...value].map((character) => character.codePointAt(0)!);
}

function assertSupportedText(value: string, font: FontMetrics): void {
  const missing = [...new Set(codePoints(value).filter((codePoint) => (
    codePoint !== 0x0a
    && codePoint !== 0x0d
    && !font.glyphForCodePoint.has(codePoint)
  )))];
  if (missing.length > 0) {
    const labels = missing
      .slice(0, 6)
      .map((codePoint) => `U+${codePoint.toString(16).toLocaleUpperCase("tr-TR").padStart(4, "0")}`)
      .join(", ");
    throw new Error(`PDF yazı tipi şu karakterleri kapsamıyor: ${labels}.`);
  }
}

function textWidth(value: string, fontSize: number, font: FontMetrics): number {
  const width = codePoints(value).reduce((total, codePoint) => {
    const glyphId = font.glyphForCodePoint.get(codePoint) ?? 0;
    return total + (font.advanceWidths[glyphId] ?? font.unitsPerEm);
  }, 0);
  return width * fontSize / font.unitsPerEm;
}

function splitLongWord(
  word: string,
  maxWidth: number,
  fontSize: number,
  font: FontMetrics,
): string[] {
  if (textWidth(word, fontSize, font) <= maxWidth) return [word];
  const pieces: string[] = [];
  let piece = "";
  for (const character of word) {
    const candidate = piece + character;
    if (piece && textWidth(candidate, fontSize, font) > maxWidth) {
      pieces.push(piece);
      piece = character;
    } else {
      piece = candidate;
    }
  }
  if (piece) pieces.push(piece);
  return pieces;
}

function wrapText(
  value: string,
  maxWidth: number,
  fontSize: number,
  font: FontMetrics,
): string[] {
  const lines: string[] = [];
  for (const rawLine of value.replaceAll("\r", "").split("\n")) {
    const words = rawLine
      .split(/\s+/u)
      .filter(Boolean)
      .flatMap((word) => splitLongWord(word, maxWidth, fontSize, font));
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && textWidth(candidate, fontSize, font) > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    lines.push(line);
  }
  return lines.length > 0 ? lines : [""];
}

function pdfNameRole(role: StructElement["role"]): string {
  return `/${role}`;
}

function pdfLiteral(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)")
    .replaceAll("\r", " ")
    .replaceAll("\n", " ");
}

function utf16Hex(value: string): string {
  let hex = "feff";
  for (const character of value) {
    const codePoint = character.codePointAt(0)!;
    if (codePoint <= 0xffff) {
      hex += codePoint.toString(16).padStart(4, "0");
    } else {
      const adjusted = codePoint - 0x10000;
      hex += (0xd800 + (adjusted >> 10)).toString(16).padStart(4, "0");
      hex += (0xdc00 + (adjusted & 0x3ff)).toString(16).padStart(4, "0");
    }
  }
  return `<${hex}>`;
}

function textHex(value: string): string {
  return `<${codePoints(value)
    .map((codePoint) => codePoint.toString(16).padStart(4, "0"))
    .join("")}>`;
}

function xmlEscape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function streamObject(dictionary: string, bytes: Uint8Array): Uint8Array {
  return joinBytes([
    encoder.encode(`<< ${dictionary} /Length ${bytes.byteLength} >>\nstream\n`),
    bytes,
    encoder.encode("\nendstream"),
  ]);
}

function createStructElement(
  role: StructElement["role"],
  options: {
    readonly altText?: string;
    readonly tableSummary?: string;
    readonly tableHeaderScope?: "Column" | "Row";
  readonly tableColumnSpan?: number;
  } = {},
): StructElement {
  return {
    role,
    children: [],
    markedContent: [],
    ...options,
  };
}

function attach(parent: StructElement, child: StructElement): StructElement {
  parent.children.push(child);
  child.parent = parent;
  return child;
}

function rgb(color: readonly [number, number, number]): string {
  return color.map((value) => value.toFixed(3)).join(" ");
}

function createPage(contentTop: number): PdfPageDraft {
  return { commands: [], structParents: [], links: [], cursorY: contentTop };
}

function addArtifact(page: PdfPageDraft, commands: string): void {
  page.commands.push(`/Artifact BMC\n${commands}\nEMC`);
}

function addMarkedCommands(
  page: PdfPageDraft,
  pageIndex: number,
  struct: StructElement,
  commands: string,
): void {
  const mcid = page.structParents.length;
  page.structParents.push(struct);
  struct.markedContent.push({ pageIndex, mcid });
  page.commands.push(`/${struct.role} <</MCID ${mcid}>> BDC\n${commands}\nEMC`);
}

function drawTextLines(
  lines: readonly string[],
  x: number,
  firstBaseline: number,
  style: TextStyle,
): string {
  const commands = [`${rgb(style.color)} rg`, "BT", `/${style.fontResource ?? "F0"} ${style.fontSize} Tf`];
  lines.forEach((line, index) => {
    const y = firstBaseline - index * style.lineHeight;
    commands.push(`1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm ${textHex(line)} Tj`);
  });
  commands.push("ET");
  return commands.join("\n");
}

function drawSingleLineCellText(
  text: string,
  x: number,
  baseline: number,
  availableWidth: number,
  style: TextStyle,
  font: FontMetrics,
  minimumScale: number,
): string {
  const naturalWidth = textWidth(text, style.fontSize, font);
  const scale = Math.min(100, availableWidth / Math.max(0.001, naturalWidth) * 100);
  if (scale + 0.001 < minimumScale) {
    throw new Error(`PDF tek sayfa hücre metni yüzde ${scale.toFixed(1)} ölçüldü; okunabilir yüzde ${minimumScale} yatay ölçek sınırına sığmıyor.`);
  }
  return [
    "q",
    `${rgb(style.color)} rg`,
    "BT",
    `/${style.fontResource ?? "F0"} ${style.fontSize} Tf`,
    `${scale.toFixed(3)} Tz`,
    `1 0 0 1 ${x.toFixed(2)} ${baseline.toFixed(2)} Tm ${textHex(text)} Tj`,
    "ET",
    "Q",
  ].join("\n");
}

function fitCellTextWithinLines(
  value: string,
  availableWidth: number,
  style: TextStyle,
  font: FontMetrics,
  maximumLines: 1 | 2,
  minimumScale: number,
): string[] {
  const text = value.replace(/\s+/gu, " ").trim();
  const scaleFor = (line: string) => availableWidth / Math.max(0.001, textWidth(line, style.fontSize, font)) * 100;
  if (maximumLines === 1 || scaleFor(text) >= minimumScale || !text.includes(" ")) return [text];
  const words = text.split(" ");
  let best: { lines: [string, string]; scale: number } | undefined;
  for (let index = 1; index < words.length; index += 1) {
    const lines: [string, string] = [words.slice(0, index).join(" "), words.slice(index).join(" ")];
    const scale = Math.min(...lines.map(scaleFor));
    if (!best || scale > best.scale) best = { lines, scale };
  }
  return best?.lines ?? [text];
}

function validateDocument(document: SemanticTaggedPdfDocument): void {
  if (document.theme !== undefined) {
    const theme = document.theme;
    const colorKeys = ["bodyColor","metaColor","headingColor","tableHeaderFill","tableHeaderColor","tableBorderColor","tableDetailFill","headerGroupTextColor"] as const;
    const validColor = (value: unknown) => Array.isArray(value) && value.length === 3 && [0,1,2].every(index => typeof value[index] === "number" && Number.isFinite(value[index]) && value[index] >= 0 && value[index] <= 1);
    if (!theme || typeof theme !== "object" || Array.isArray(theme)
      || Object.keys(theme).some(key => ![...colorKeys,"headerGroupFills","headerGroupTints","boldHeadings"].includes(key))
      || colorKeys.some(key => !validColor(theme[key]))
      || !Array.isArray(theme.headerGroupFills) || !theme.headerGroupFills.length || theme.headerGroupFills.length > 20 || Array.from(theme.headerGroupFills).some(color => !validColor(color))
      || !Array.isArray(theme.headerGroupTints) || theme.headerGroupTints.length !== theme.headerGroupFills.length || Array.from(theme.headerGroupTints).some(color => !validColor(color))
      || (theme.boldHeadings !== undefined && typeof theme.boldHeadings !== "boolean")) throw new Error("PDF tema renkleri ve yazı ağırlığı geçersiz.");
  }
  if (document.pageFormat !== undefined && !["A4", "A5"].includes(document.pageFormat)) throw new Error("PDF sayfa boyutu geçersiz.");
  if (document.orientation !== undefined && !["portrait", "landscape"].includes(document.orientation)) {
    throw new Error("PDF sayfa yönü geçersiz.");
  }
  if (document.pageMargin !== undefined && (!Number.isFinite(document.pageMargin) || document.pageMargin < 28 || document.pageMargin > 72)) {
    throw new Error("PDF kenar boşluğu 28 ile 72 punto arasında olmalıdır.");
  }
  if (!document.title.trim()) throw new Error("PDF belge başlığı boş bırakılamaz.");
  if ((document.language ?? "tr-TR") !== "tr-TR") {
    throw new Error("Erişilebilir belge motoru yalnız tr-TR belge dili üretir.");
  }
  if (document.nodes.length === 0) throw new Error("PDF en az bir semantik içerik taşımalıdır.");
  for (const node of document.nodes) {
    if (node.kind === "heading" || node.kind === "paragraph") {
      if (!node.text.trim()) throw new Error("PDF başlık ve paragrafları boş olamaz.");
      if (node.kind === "paragraph" && node.href !== undefined) {
        let target: URL;
        try { target = new URL(node.href); } catch { throw new Error("PDF bağlantısı geçerli bir web adresi olmalıdır."); }
        if (!["http:", "https:"].includes(target.protocol) || target.username || target.password) throw new Error("PDF bağlantısı yalnız http/https web adresi olabilir.");
      }
      if (node.kind === "paragraph" && node.placement) {
        const box = node.placement;
        const width = document.orientation === "landscape" ? (document.pageFormat === "A5" ? A4_WIDTH : A4_HEIGHT) : (document.pageFormat === "A5" ? A4_HEIGHT / 2 : A4_WIDTH);
        const height = document.orientation === "landscape" ? (document.pageFormat === "A5" ? A4_HEIGHT / 2 : A4_WIDTH) : (document.pageFormat === "A5" ? A4_WIDTH : A4_HEIGHT);
        if (![box.x, box.y, box.width, box.height, box.fontSize ?? 10].every(Number.isFinite)
          || box.x < 0 || box.y < 0 || box.width <= 0 || box.height <= 0 || (box.fontSize ?? 10) <= 0
          || box.x + box.width > width + 0.1 || box.y + box.height > height + 0.1 || /[\r\n]/u.test(node.text)) {
          throw new Error("PDF metin kutusu sayfa içinde tek satır olmalıdır.");
        }
      }
    } else if (node.kind === "list") {
      if (node.items.length === 0 || node.items.some((item) => !item.trim())) {
        throw new Error("PDF listesi en az bir dolu öğe taşımalıdır.");
      }
    } else if (node.kind === "table") {
      if (node.headers.length === 0 || node.headers.some((header) => !header.trim())) {
        throw new Error("PDF tablosu dolu sütun başlıkları taşımalıdır.");
      }
      if (node.rows.some((row) => row.length !== node.headers.length)) {
        throw new Error("PDF tablo satırlarının sütun sayısı başlıklarla eşleşmelidir.");
      }
      if (node.headerGroups !== undefined && (!Array.isArray(node.headerGroups) || !node.headerGroups.length
        || node.headerGroups.some((group) => !group || typeof group.label !== "string" || !group.label.trim() || !Number.isInteger(group.span) || group.span < 1)
        || node.headerGroups.reduce((sum, group) => sum + group.span, 0) !== node.headers.length)) {
        throw new Error("PDF birleşik başlık aralıkları tüm sütunları tam kapsamalıdır.");
      }
      if (node.headerGroups?.some(group => group.colorIndex !== undefined && (!document.theme || !Number.isInteger(group.colorIndex) || group.colorIndex < 0 || group.colorIndex >= document.theme.headerGroupFills.length))) throw new Error("PDF başlık rengi geçerli bir tema rengini seçmelidir.");
      if (node.rowDetails !== undefined && (!Array.isArray(node.rowDetails) || node.rowDetails.length !== node.rows.length
        || node.rowDetails.some((detail) => detail !== null && (typeof detail !== "string" || !detail.trim())))) {
        throw new Error("PDF ayrıntı bantları satırlarla eşleşen dolu metin veya null olmalıdır.");
      }
      if (
        node.columnWeights
        && (
          node.columnWeights.length !== node.headers.length
          || node.columnWeights.some((weight) => !Number.isFinite(weight) || weight <= 0)
        )
      ) {
        throw new Error("PDF tablo sütun ağırlıkları başlıklarla eşleşen pozitif sayılar olmalıdır.");
      }
      if (
        node.cellPadding !== undefined
        && (!Number.isFinite(node.cellPadding) || node.cellPadding < 2 || node.cellPadding > 12)
      ) {
        throw new Error("PDF tablo hücre iç boşluğu 2 ile 12 punto arasında olmalıdır.");
      }
      if (node.fontSize !== undefined && (!Number.isFinite(node.fontSize) || node.fontSize < 8 || node.fontSize > 12)) {
        throw new Error("PDF tablo yazı boyutu 8 ile 12 punto arasında olmalıdır.");
      }
      if (node.fitBodyCellsWithinLines !== undefined && ![1, 2].includes(node.fitBodyCellsWithinLines)) {
        throw new Error("PDF dar hücre sığdırma satır sayısı geçersiz.");
      }
      if (node.minimumBodyCellHorizontalScale !== undefined && (
        node.fitBodyCellsWithinLines === undefined
        || !Number.isFinite(node.minimumBodyCellHorizontalScale)
        || node.minimumBodyCellHorizontalScale < 35
        || node.minimumBodyCellHorizontalScale > 100
      )) throw new Error("PDF dar hücre ölçeği yüzde 35 ile 100 arasında olmalıdır.");
      if (node.reserveAfter !== undefined && node.reserveAfter !== "following-content" && (!Number.isFinite(node.reserveAfter) || node.reserveAfter < 0 || node.reserveAfter > 120)) {
        throw new Error("PDF tablo sonrası ayrılan alan 0 ile 120 punto arasında olmalıdır.");
      }
      if (
        node.rowHeaderColumn !== undefined
        && (
          !Number.isInteger(node.rowHeaderColumn)
          || node.rowHeaderColumn < 0
          || node.rowHeaderColumn >= node.headers.length
        )
      ) {
        throw new Error("PDF tablo satır başlığı sütunu geçerli bir sütun dizini olmalıdır.");
      }
      if (node.rowGroupColumn !== undefined && (!Number.isInteger(node.rowGroupColumn) || node.rowGroupColumn < 0 || node.rowGroupColumn >= node.headers.length)) {
        throw new Error("PDF tablo satır grubu sütunu geçerli bir sütun dizini olmalıdır.");
      }
      if (
        node.continuationContextColumns
        && (
          new Set(node.continuationContextColumns).size !== node.continuationContextColumns.length
          || node.continuationContextColumns.some((column) => (
            !Number.isInteger(column) || column < 0 || column >= node.headers.length
          ))
        )
      ) {
        throw new Error("PDF tablo devam bağlamı sütunları tekil ve geçerli olmalıdır.");
      }
    } else if (!node.altText.trim()) {
      throw new Error("PDF şekli açıklayıcı alternatif metin taşımalıdır.");
    }
  }
  for (const entry of document.technicalMetadata ?? []) {
    if (!/^[a-z0-9][a-z0-9._:-]{0,79}$/u.test(entry.key)) {
      throw new Error("PDF teknik metadata anahtarı güvenli, küçük harfli bir kimlik olmalıdır.");
    }
    if (!entry.value.trim()) {
      throw new Error("PDF teknik metadata değeri boş bırakılamaz.");
    }
  }
  if (document.artifactFooterText !== undefined && !document.artifactFooterText.trim()) {
    throw new Error("PDF sayfa altı güvenlik notu boş bırakılamaz.");
  }
}

async function loadDefaultFontBytes(): Promise<Uint8Array> {
  if (typeof fetch !== "function") {
    throw new Error("PDF yazı tipi yükleyicisi bu ortamda kullanılamıyor.");
  }
  const response = await fetch(ACCESSIBLE_PDF_FONT_ASSET_PATH, {
    cache: "force-cache",
    credentials: "same-origin",
  });
  if (!response.ok) {
    throw new Error(`PDF yazı tipi yüklenemedi (${response.status}).`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

async function loadDefaultBoldFontBytes(): Promise<Uint8Array> {
  try {
    const response = await fetch(ACCESSIBLE_PDF_BOLD_FONT_ASSET_PATH, { cache: "force-cache", credentials: "same-origin" });
    if (!response.ok) throw new Error(String(response.status));
    return new Uint8Array(await response.arrayBuffer());
  } catch {
    throw new Error("PDF kalın yazı tipi yüklenemedi. Yazı tipi dosyası hazır olduğunda yeniden deneyin.");
  }
}

function collectDocumentText(document: SemanticTaggedPdfDocument): string[] {
  return [
    document.title,
    document.artifactFooterText ?? "",
    document.artifactHeaderText ?? "",
    ...document.nodes.flatMap((node) => {
      if (node.kind === "heading" || node.kind === "paragraph") return [node.text, ...(node.kind === "heading" && node.continuationHeaderText ? [node.continuationHeaderText] : [])];
      if (node.kind === "list") return node.items;
      if (node.kind === "table") {
        return [node.summary ?? "", ...node.headers, ...node.rows.flat(), ...(node.headerGroups?.map((group) => group.label) ?? []), ...(node.rowDetails?.filter((detail): detail is string => detail !== null) ?? [])];
      }
      return [node.altText, node.caption ?? ""];
    }),
    "MaarifOS",
    document.includeTotalPages ? "Sayfa /" : "Sayfa",
    "Devam … boş · :",
    "• — 0123456789",
  ].filter(Boolean);
}

function usedCodePoints(document: SemanticTaggedPdfDocument): number[] {
  return [...new Set(collectDocumentText(document).flatMap(codePoints))]
    .filter((codePoint) => codePoint !== 0x0a && codePoint !== 0x0d)
    .sort((left, right) => left - right);
}

function scaledFontMetric(value: number, font: FontMetrics): number {
  return Math.round(value * 1000 / font.unitsPerEm);
}

function renderToUnicodeCmap(codePointValues: readonly number[]): Uint8Array {
  const mappings = codePointValues.map((codePoint) => (
    `<${codePoint.toString(16).padStart(4, "0")}> <${codePoint.toString(16).padStart(4, "0")}>`
  ));
  const chunks: string[] = [];
  for (let index = 0; index < mappings.length; index += 100) {
    const chunk = mappings.slice(index, index + 100);
    chunks.push(`${chunk.length} beginbfchar\n${chunk.join("\n")}\nendbfchar`);
  }
  return encoder.encode(
    `/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n`
      + `/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n`
      + `/CMapName /MaarifOS-UCS def\n/CMapType 2 def\n`
      + `1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n`
      + `${chunks.join("\n")}\nendcmap\nCMapName currentdict /CMap defineresource pop\nend\nend`,
  );
}

function renderWidths(codePointValues: readonly number[], font: FontMetrics): string {
  return codePointValues.map((codePoint) => {
    const glyphId = font.glyphForCodePoint.get(codePoint)!;
    return `${codePoint} [${scaledFontMetric(font.advanceWidths[glyphId]!, font)}]`;
  }).join(" ");
}

function createCidToGidMap(
  codePointValues: readonly number[],
  font: FontMetrics,
): Uint8Array {
  const maxCodePoint = codePointValues.at(-1) ?? 0;
  const bytes = new Uint8Array((maxCodePoint + 1) * 2);
  for (const codePoint of codePointValues) {
    const glyphId = font.glyphForCodePoint.get(codePoint)!;
    bytes[codePoint * 2] = glyphId >> 8;
    bytes[codePoint * 2 + 1] = glyphId & 0xff;
  }
  return bytes;
}

function createCidSet(codePointValues: readonly number[]): Uint8Array {
  const maxCodePoint = codePointValues.at(-1) ?? 0;
  const bytes = new Uint8Array(Math.ceil((maxCodePoint + 1) / 8));
  for (const codePoint of codePointValues) {
    bytes[Math.floor(codePoint / 8)]! |= 1 << (7 - codePoint % 8);
  }
  return bytes;
}

function flattenStructElements(root: StructElement): StructElement[] {
  const output: StructElement[] = [];
  const visit = (element: StructElement) => {
    output.push(element);
    element.children.forEach(visit);
  };
  visit(root);
  return output;
}

function serializePdfObjects(
  objects: readonly PdfObject[],
  rootId: number,
  infoId: number,
): Uint8Array {
  const sorted = [...objects].sort((left, right) => left.id - right.id);
  const parts: Uint8Array[] = [
    encoder.encode("%PDF-1.7\n"),
    Uint8Array.from([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]),
  ];
  const offsets = new Map<number, number>();
  let offset = parts.reduce((total, part) => total + part.byteLength, 0);
  for (const object of sorted) {
    const prefix = encoder.encode(`${object.id} 0 obj\n`);
    const suffix = encoder.encode("\nendobj\n");
    offsets.set(object.id, offset);
    parts.push(prefix, object.bytes, suffix);
    offset += prefix.byteLength + object.bytes.byteLength + suffix.byteLength;
  }
  const xrefOffset = offset;
  const maxId = sorted.at(-1)?.id ?? 0;
  const xref = [`xref\n0 ${maxId + 1}\n`, "0000000000 65535 f \n"];
  for (let id = 1; id <= maxId; id += 1) {
    const objectOffset = offsets.get(id);
    xref.push(
      objectOffset === undefined
        ? "0000000000 00000 f \n"
        : `${String(objectOffset).padStart(10, "0")} 00000 n \n`,
    );
  }
  parts.push(encoder.encode(
    `${xref.join("")}trailer\n<< /Size ${maxId + 1} /Root ${rootId} 0 R /Info ${infoId} 0 R >>\n`
      + `startxref\n${xrefOffset}\n%%EOF`,
  ));
  return joinBytes(parts);
}

/**
 * Ortak semantik modelden etiketli, seçilebilir metinli PDF 1.7 üretir.
 * Yapısal otomasyon kanıtı PDF/UA uzman kabulünün yerini tutmaz; durum bu
 * nedenle bilinçli olarak IMPLEMENTED_UNVERIFIED tutulur.
 */
export async function createSemanticTaggedPdf(
  document: SemanticTaggedPdfDocument,
  runtime: SemanticTaggedPdfRuntime = {},
): Promise<Uint8Array> {
  validateDocument(document);
  const pageWidth = document.orientation === "landscape" ? (document.pageFormat === "A5" ? A4_WIDTH : A4_HEIGHT) : (document.pageFormat === "A5" ? A4_HEIGHT / 2 : A4_WIDTH);
  const pageHeight = document.orientation === "landscape" ? (document.pageFormat === "A5" ? A4_HEIGHT / 2 : A4_WIDTH) : (document.pageFormat === "A5" ? A4_WIDTH : A4_HEIGHT);
  const pageMargin = document.pageMargin ?? 54;
  let contentTop = pageHeight - pageMargin;
  const contentBottom = Math.max(pageMargin, 40);
  const loadedFont = runtime.fontBytes
    ?? await (runtime.loadFontBytes ?? loadDefaultFontBytes)();
  const font = parseFontMetrics(loadedFont);
  const theme = document.theme;
  let loadedBoldFont: Uint8Array | undefined;
  let boldFont: FontMetrics | undefined;
  if (theme?.boldHeadings) {
    try {
      loadedBoldFont = runtime.boldFontBytes ?? await (runtime.loadBoldFontBytes ?? loadDefaultBoldFontBytes)();
      boldFont = parseFontMetrics(loadedBoldFont);
      if (boldFont.weight < 700) throw new Error("Kalın yazı tipi ağırlığı doğrulanamadı.");
    } catch {
      throw new Error("PDF kalın yazı tipi yüklenemedi veya doğrulanamadı. Geçerli kalın yazı tipiyle yeniden deneyin.");
    }
  }
  const bodyStyle: TextStyle = theme ? { ...BODY_STYLE, color: theme.bodyColor } : BODY_STYLE;
  const metaStyle: TextStyle = theme ? { ...META_STYLE, color: theme.metaColor } : META_STYLE;
  const headingStyle = (level: SemanticPdfHeadingLevel): TextStyle => theme ? { ...HEADING_STYLES[level], color: theme.headingColor, ...(boldFont ? {fontResource:"F1" as const} : {}) } : HEADING_STYLES[level];
  const styleFont = (style: TextStyle) => style.fontResource === "F1" ? boldFont! : font;
  let activeHeaderText = document.artifactHeaderText;
  const headerLineCount = Math.max(0, ...[document.artifactHeaderText, ...document.nodes.flatMap(node => node.kind === "heading" ? [node.continuationHeaderText] : [])]
    .filter((value): value is string => Boolean(value)).map(value => wrapText(value, pageWidth - pageMargin * 2, 7.5, font).length));
  if (headerLineCount) contentTop = pageHeight - Math.max(pageMargin, headerLineCount * 10 + 15);
  for (const value of collectDocumentText(document)) assertSupportedText(value, font);
  if (boldFont) for (const value of collectDocumentText(document)) assertSupportedText(value, boldFont);
  const pageDrafts: PdfPageDraft[] = [createPage(contentTop)];
  pageDrafts[0]!.headerText = document.artifactHeaderOnFirstPage === false ? undefined : activeHeaderText;
  const figureBoxes: SemanticPdfFigureBox[] = [];
  const documentStruct = createStructElement("Document");
  let pageIndex = 0;

  const currentPage = () => pageDrafts[pageIndex]!;
  const nextPage = () => {
    pageDrafts.push(createPage(contentTop));
    pageIndex += 1;
    currentPage().headerText = activeHeaderText;
  };
  const ensureSpace = (height: number, force = false) => {
    if (
      currentPage().cursorY < contentTop
      && (force || currentPage().cursorY - height < contentBottom)
    ) nextPage();
  };
  const applySectionBreak = (force: boolean) => {
    const page = currentPage();
    if (page.cursorY === contentTop) return;
    const usedHeight = contentTop - page.cursorY;
    const contentHeight = contentTop - contentBottom;
    if (force || usedHeight >= contentHeight * 0.42) nextPage();
  };
  const addTextFlow = (
    struct: StructElement,
    text: string,
    style: TextStyle,
    x = pageMargin,
    width = pageWidth - pageMargin * 2,
    minimumStartHeight = style.lineHeight,
    href?: string,
  ) => {
    const lines = wrapText(text, width, style.fontSize, styleFont(style));
    ensureSpace(Math.max(minimumStartHeight, style.lineHeight + style.gap));
    let lineIndex = 0;
    while (lineIndex < lines.length) {
      const page = currentPage();
      const availableLines = Math.max(
        1,
        Math.floor((page.cursorY - contentBottom - style.gap) / style.lineHeight),
      );
      const chunk = lines.slice(lineIndex, lineIndex + availableLines);
      const baseline = page.cursorY - style.fontSize;
      addMarkedCommands(
        page,
        pageIndex,
        struct,
        drawTextLines(chunk, x, baseline, style),
      );
      if (href) chunk.forEach((line, index) => {
        const y = baseline - index * style.lineHeight;
        page.links.push({ uri: href, rect: [x, y - style.fontSize * 0.25, x + textWidth(line, style.fontSize, styleFont(style)), y + style.fontSize] });
      });
      page.cursorY -= chunk.length * style.lineHeight + style.gap;
      lineIndex += chunk.length;
      if (lineIndex < lines.length) nextPage();
    }
  };

  const tableStartHeight = (node: Extract<SemanticPdfNode, { kind: "table" }>): number => {
    const size = node.fontSize ?? META_STYLE.fontSize;
    const lineHeight = node.fontSize === undefined ? META_STYLE.lineHeight : size * 1.35;
    const padding = node.cellPadding ?? 5;
    const weights = node.columnWeights ?? node.headers.map(() => 1);
    const total = weights.reduce((sum, value) => sum + value, 0);
    const rowHeight = (row: readonly string[], metrics = font) => Math.max(...row.map((text, index) => wrapText(text, (pageWidth - pageMargin * 2) * weights[index]! / total - padding * 2, size, metrics).length)) * lineHeight + padding * 2;
    let columnOffset = 0;
    const groupedHeaderLines = node.headerGroups?.map((group) => {
      const width = weights.slice(columnOffset, columnOffset + group.span).reduce((sum, value) => sum + value, 0) / total * (pageWidth - pageMargin * 2);
      columnOffset += group.span;
      return wrapText(group.label, width - padding * 2, size, boldFont ?? font).length;
    });
    const header = rowHeight(node.headers, boldFont ?? font) + (groupedHeaderLines ? Math.max(...groupedHeaderLines) * lineHeight + padding * 2 : 0);
    if ((node.headerGroups || node.rowDetails) && header + lineHeight + padding * 2 > contentTop - contentBottom) {
      throw new Error("PDF tablo başlıkları bir veri satırıyla birlikte sayfaya sığmıyor.");
    }
    let firstGroup = 0;
    for (const [index, row] of node.rows.entries()) {
      if (index > 0 && (node.rowGroupColumn === undefined || row[node.rowGroupColumn] !== node.rows[0]![node.rowGroupColumn])) break;
      firstGroup += rowHeight(row);
      const detail = node.rowDetails?.[index];
      if (detail) firstGroup += wrapText(detail, pageWidth - pageMargin * 2 - padding * 2, size, font).length * lineHeight + padding * 2;
    }
    const freshCapacity = contentTop - contentBottom - header;
    if (node.headerGroups || node.rowDetails) {
      // First-page branding can consume substantial room. Reserve the first complete
      // contact row, then let its group continue naturally instead of making a cover-only page.
      const firstRow = node.rows[0] ? rowHeight(node.rows[0]) : 0;
      return header + (firstRow > freshCapacity ? lineHeight + padding * 2 : firstRow);
    }
    return header + Math.min(firstGroup, freshCapacity);
  };
  for (const [nodeIndex, node] of document.nodes.entries()) {
    if (node.kind === "heading" && node.continuationHeaderText) activeHeaderText = node.continuationHeaderText;
    if (node.pageBreakBefore) {
      applySectionBreak(
        "forcePageBreakBefore" in node && node.forcePageBreakBefore === true,
      );
    }
    if (node.kind === "heading") {
      if (node.continuationHeaderText) currentPage().headerText = undefined;
      const struct = attach(documentStruct, createStructElement(`H${node.level}`));
      const style = headingStyle(node.level);
      const next = document.nodes[nodeIndex + 1];
      const tableReserve = next?.kind === "table" ? tableStartHeight(next) + wrapText(node.text, pageWidth - pageMargin * 2, style.fontSize, styleFont(style)).length * style.lineHeight + style.gap : 0;
      addTextFlow(
        struct,
        node.text,
        style,
        pageMargin,
        pageWidth - pageMargin * 2,
        Math.max(style.lineHeight * 2 + bodyStyle.lineHeight * 2, tableReserve),
      );
      continue;
    }
    if (node.kind === "paragraph") {
      const struct = attach(documentStruct, createStructElement("P"));
      if (node.placement) {
        const box = node.placement;
        const fontSize = box.fontSize ?? box.height * 0.8;
        const horizontalScale = box.width / Math.max(0.001, textWidth(node.text, fontSize, font)) * 100;
        const baseline = pageHeight - box.y - box.height * 0.8;
        addMarkedCommands(currentPage(), pageIndex, struct, `q\nBT\n/F0 ${fontSize.toFixed(3)} Tf\n${box.invisible ? "3" : "0"} Tr\n${horizontalScale.toFixed(3)} Tz\n1 0 0 1 ${box.x.toFixed(3)} ${baseline.toFixed(3)} Tm ${textHex(node.text)} Tj\nET\nQ`);
        currentPage().cursorY = Math.min(currentPage().cursorY, contentTop - 1);
      } else addTextFlow(struct, node.text, node.tone === "meta" ? metaStyle : bodyStyle, pageMargin, pageWidth - pageMargin * 2, 0, node.href);
      continue;
    }
    if (node.kind === "list") {
      const list = attach(documentStruct, createStructElement("L"));
      node.items.forEach((item, itemIndex) => {
        ensureSpace(bodyStyle.lineHeight * 2 + bodyStyle.gap);
        const listItem = attach(list, createStructElement("LI"));
        const label = attach(listItem, createStructElement("Lbl"));
        const body = attach(listItem, createStructElement("LBody"));
        const labelText = node.ordered ? `${itemIndex + 1}.` : "•";
        const labelWidth = 22;
        const lines = wrapText(
          item,
          pageWidth - pageMargin * 2 - labelWidth,
          bodyStyle.fontSize,
          font,
        );
        const startPage = currentPage();
        const baseline = startPage.cursorY - bodyStyle.fontSize;
        addMarkedCommands(
          startPage,
          pageIndex,
          label,
          drawTextLines([labelText], pageMargin, baseline, bodyStyle),
        );
        let lineIndex = 0;
        while (lineIndex < lines.length) {
          const page = currentPage();
          const availableLines = Math.max(
            1,
            Math.floor((page.cursorY - contentBottom - bodyStyle.gap) / bodyStyle.lineHeight),
          );
          const chunk = lines.slice(lineIndex, lineIndex + availableLines);
          addMarkedCommands(
            page,
            pageIndex,
            body,
            drawTextLines(
              chunk,
              pageMargin + labelWidth,
              page.cursorY - bodyStyle.fontSize,
              bodyStyle,
            ),
          );
          page.cursorY -= chunk.length * bodyStyle.lineHeight + bodyStyle.gap;
          lineIndex += chunk.length;
          if (lineIndex < lines.length) nextPage();
        }
      });
      continue;
    }
    if (node.kind === "table") {
      const following = document.nodes[nodeIndex + 1];
      const reserveAfter = node.reserveAfter === "following-content"
        ? (following?.kind === "table" && !following.pageBreakBefore ? tableStartHeight(following) + bodyStyle.gap : 0)
        : node.reserveAfter ?? 0;
      const baseTableStyle: TextStyle = node.fontSize === undefined ? metaStyle : { ...metaStyle, fontSize: node.fontSize, lineHeight: node.fontSize * 1.35 };
      const tableStyle: TextStyle = theme ? { ...baseTableStyle, color: theme.bodyColor } : baseTableStyle;
      const headerStyle: TextStyle = theme ? { ...tableStyle, color: theme.tableHeaderColor, ...(boldFont ? {fontResource:"F1" as const} : {}) } : tableStyle;
      const headerFont = boldFont ?? font;
      const table = attach(
        documentStruct,
        createStructElement("Table", node.summary ? { tableSummary: node.summary } : {}),
      );
      const contentWidth = pageWidth - pageMargin * 2;
      const cellPadding = node.cellPadding ?? 5;
      const weights = node.columnWeights ?? node.headers.map(() => 1);
      const weightTotal = weights.reduce((total, weight) => total + weight, 0);
      const columnWidths = weights.map((weight) => contentWidth * weight / weightTotal);
      const columnX = columnWidths.map((_, columnIndex) => (
        pageMargin
        + columnWidths.slice(0, columnIndex).reduce((total, width) => total + width, 0)
      ));
      const headerLines = node.headers.map((header, columnIndex) => wrapText(
        header,
        columnWidths[columnIndex]! - cellPadding * 2,
        tableStyle.fontSize,
        headerFont,
      ));
      const headerHeight = Math.max(...headerLines.map((lines) => lines.length))
        * tableStyle.lineHeight + cellPadding * 2;

      let groupedColumnOffset = 0;
      const groupLayouts = node.headerGroups?.map((group, groupIndex) => {
        const x = columnX[groupedColumnOffset]!;
        const width = columnWidths.slice(groupedColumnOffset, groupedColumnOffset + group.span).reduce((sum, value) => sum + value, 0);
        groupedColumnOffset += group.span;
        const colorIndex = group.colorIndex ?? groupIndex % (theme?.headerGroupFills.length ?? 1);
        return { ...group, colorIndex, x, width, lines: wrapText(group.label, width - cellPadding * 2, tableStyle.fontSize, headerFont) };
      });
      const groupHeaderHeight = groupLayouts ? Math.max(...groupLayouts.map((group) => group.lines.length)) * tableStyle.lineHeight + cellPadding * 2 : 0;
      const totalHeaderHeight = headerHeight + groupHeaderHeight;
      const drawGroupHeader = (marked: boolean) => {
        if (!groupLayouts) return;
        const page = currentPage();
        const top = page.cursorY;
        const groupRow = marked ? attach(table, createStructElement("TR")) : null;
        for (const group of groupLayouts) {
          addArtifact(page, `${theme ? `${rgb(theme.headerGroupFills[group.colorIndex]!)} rg ${rgb(theme.tableBorderColor)} RG 0.65 w` : "0.87 0.91 0.90 rg 0.72 0.69 0.76 RG 0.5 w"} ${group.x.toFixed(2)} ${(top - groupHeaderHeight).toFixed(2)} ${group.width.toFixed(2)} ${groupHeaderHeight.toFixed(2)} re B`);
          const groupStyle = theme ? {...headerStyle,color:theme.headerGroupTextColor} : tableStyle;
          const commands = group.lines.map((line, index) => drawTextLines([line], group.x + (group.width - textWidth(line, tableStyle.fontSize, headerFont)) / 2, top - tableStyle.fontSize - cellPadding - index * tableStyle.lineHeight, groupStyle)).join("\n");
          if (groupRow) addMarkedCommands(page, pageIndex, attach(groupRow, createStructElement("TH", { tableHeaderScope: "Column", tableColumnSpan: group.span })), commands);
          else addArtifact(page, commands);
        }
        page.cursorY -= groupHeaderHeight;
      };

      const drawRowBackground = (
        page: PdfPageDraft,
        rowTop: number,
        rowHeight: number,
        header: boolean,
      ) => {
        if (theme) {
          columnWidths.forEach((width, columnIndex) => {
            const x = columnX[columnIndex]!;
            const group = groupLayouts?.find(group => x >= group.x - 0.01 && x < group.x + group.width - 0.01);
            const fill = header ? group ? theme.headerGroupTints[group.colorIndex]! : theme.tableHeaderFill : [1,1,1] as const;
            addArtifact(page, `${rgb(fill)} rg ${rgb(theme.tableBorderColor)} RG 0.65 w ${x.toFixed(2)} ${(rowTop - rowHeight).toFixed(2)} ${width.toFixed(2)} ${rowHeight.toFixed(2)} re B`);
          });
          return;
        }
        addArtifact(
          page,
          `${header ? "0.94 0.92 0.97 rg" : "1 1 1 rg"}\n`
            + `${pageMargin.toFixed(2)} ${(rowTop - rowHeight).toFixed(2)} `
            + `${contentWidth.toFixed(2)} ${rowHeight.toFixed(2)} re f\n`
            + `0.72 0.69 0.76 RG 0.5 w`,
        );
        columnWidths.forEach((width, columnIndex) => {
          addArtifact(
            page,
            `${columnX[columnIndex]!.toFixed(2)} ${(rowTop - rowHeight).toFixed(2)} `
              + `${width.toFixed(2)} ${rowHeight.toFixed(2)} re S`,
          );
        });
      };
      const drawRepeatedHeaderArtifact = () => {
        ensureSpace(totalHeaderHeight);
        drawGroupHeader(false);
        const page = currentPage();
        const rowTop = page.cursorY;
        drawRowBackground(page, rowTop, headerHeight, true);
        const textCommands = headerLines.map((lines, columnIndex) => drawTextLines(
          lines,
          columnX[columnIndex]! + cellPadding,
          rowTop - tableStyle.fontSize - cellPadding,
          headerStyle,
        )).join("\n");
        addArtifact(page, textCommands);
        page.cursorY -= headerHeight;
      };

      ensureSpace(tableStartHeight(node));
      drawGroupHeader(true);
      const headerPage = currentPage();
      const headerTop = headerPage.cursorY;
      drawRowBackground(headerPage, headerTop, headerHeight, true);
      const headerRow = attach(table, createStructElement("TR"));
      node.headers.forEach((_, columnIndex) => {
        const cellStruct = attach(
          headerRow,
          createStructElement("TH", { tableHeaderScope: "Column" }),
        );
        addMarkedCommands(
          headerPage,
          pageIndex,
          cellStruct,
          drawTextLines(
            headerLines[columnIndex]!,
            columnX[columnIndex]! + cellPadding,
            headerTop - tableStyle.fontSize - cellPadding,
            headerStyle,
          ),
        );
      });
      headerPage.cursorY -= headerHeight;

      const rowLayouts = node.rows.map((row) => row.map((cell, columnIndex) => (
        node.fitBodyCellsWithinLines
          ? fitCellTextWithinLines(
            cell,
            columnWidths[columnIndex]! - cellPadding * 2,
            tableStyle,
            font,
            node.fitBodyCellsWithinLines,
            node.minimumBodyCellHorizontalScale ?? 35,
          )
          : wrapText(
            cell,
            columnWidths[columnIndex]! - cellPadding * 2,
            tableStyle.fontSize,
            font,
          )
      )));
      const balancedBreaks = new Set<number>();
      const detailLayouts = node.rows.map((_, index) => node.rowDetails?.[index] ? wrapText(node.rowDetails[index]!, contentWidth - cellPadding * 2, tableStyle.fontSize, font) : null);
      const rowHeights = rowLayouts.map((cells, index) => Math.max(...cells.map((lines) => lines.length)) * tableStyle.lineHeight + cellPadding * 2
        + (detailLayouts[index] ? detailLayouts[index]!.length * tableStyle.lineHeight + cellPadding * 2 : 0));
      const rowGroups: { start: number; end: number; height: number }[] = [];
      rowHeights.forEach((height, rowIndex) => {
        const previous = rowGroups.at(-1);
        if (node.rowGroupColumn !== undefined && previous && node.rows[previous.start]![node.rowGroupColumn] === node.rows[rowIndex]![node.rowGroupColumn]) {
          previous.end = rowIndex + 1; previous.height += height;
        } else rowGroups.push({ start: rowIndex, end: rowIndex + 1, height });
      });
      const groupStarts = new Map(rowGroups.map((group) => [group.start, group.height]));
      if (node.balancePages && rowLayouts.length && (!(node.headerGroups || node.rowDetails) || rowGroups.every(group => group.height <= contentTop - totalHeaderHeight - contentBottom) && (rowGroups[0]?.height ?? 0) <= currentPage().cursorY - contentBottom)) {
        const heights = rowGroups.map((group) => group.height);
        const firstCapacity = currentPage().cursorY - contentBottom;
        const fullCapacity = contentTop - totalHeaderHeight - contentBottom;
        const reserve = reserveAfter;
        const groups: { start: number; end: number; height: number; capacity: number }[] = [];
        let start = 0;
        while (start < heights.length) {
          const capacity = groups.length ? fullCapacity : firstCapacity;
          let end = start;
          let height = 0;
          while (end < heights.length && (end === start || height + heights[end]! + (end === heights.length - 1 ? reserve : 0) <= capacity)) {
            height += heights[end]!;
            end += 1;
          }
          groups.push({ start, end, height, capacity });
          start = end;
        }
        // Work backward so the final sheet is balanced without changing order.
        for (let groupIndex = groups.length - 1; groupIndex > 0; groupIndex -= 1) {
          const previous = groups[groupIndex - 1]!;
          const current = groups[groupIndex]!;
          const tailReserve = groupIndex === groups.length - 1 ? reserve : 0;
          while (previous.end - previous.start > 1) {
            const height = heights[previous.end - 1]!;
            const before = Math.abs(previous.height / previous.capacity - (current.height + tailReserve) / current.capacity);
            const after = Math.abs((previous.height - height) / previous.capacity - (current.height + height + tailReserve) / current.capacity);
            if (current.height + height + tailReserve > current.capacity || after >= before) break;
            previous.end -= 1;
            previous.height -= height;
            current.start -= 1;
            current.height += height;
          }
        }
        groups.slice(1).forEach((group) => balancedBreaks.add(rowGroups[group.start]!.start));
      }
      node.rows.forEach((row, rowIndex) => {
        if (balancedBreaks.has(rowIndex)) { nextPage(); drawRepeatedHeaderArtifact(); }
        const groupHeight = groupStarts.get(rowIndex);
        const groupTailReserve = (node.headerGroups || node.rowDetails) && rowGroups.at(-1)?.start === rowIndex ? reserveAfter : 0;
        const requiredGroupHeight = groupHeight === undefined ? undefined : groupHeight + groupTailReserve;
        if (rowIndex > 0 && requiredGroupHeight !== undefined && requiredGroupHeight <= contentTop - totalHeaderHeight - contentBottom && requiredGroupHeight > currentPage().cursorY - contentBottom) {
          nextPage(); drawRepeatedHeaderArtifact();
        }
        const cellLines = rowLayouts[rowIndex]!;
        const maximumLineCount = Math.max(...cellLines.map((lines) => lines.length));
        const rowStruct = attach(table, createStructElement("TR"));
        const cellStructs = row.map((_, columnIndex) => attach(
          rowStruct,
          createStructElement(
            columnIndex === node.rowHeaderColumn ? "TH" : "TD",
            columnIndex === node.rowHeaderColumn ? { tableHeaderScope: "Row" } : {},
          ),
        ));
        const fullRowHeight = maximumLineCount * tableStyle.lineHeight + cellPadding * 2;
        const freshPageRowHeight = contentTop - totalHeaderHeight - contentBottom;
        const currentAvailableHeight = currentPage().cursorY - contentBottom;
        const attachedDetailHeight = detailLayouts[rowIndex] ? detailLayouts[rowIndex]!.length * tableStyle.lineHeight + cellPadding * 2 : 0;
        const rowTailReserve = (node.headerGroups || node.rowDetails) && rowIndex === node.rows.length - 1 ? reserveAfter : 0;
        const completeRowHeight = fullRowHeight + attachedDetailHeight + rowTailReserve;
        const requiredRowHeight = completeRowHeight <= freshPageRowHeight ? completeRowHeight : fullRowHeight;
        if (
          requiredRowHeight > currentAvailableHeight
          && currentAvailableHeight < freshPageRowHeight - 0.01
          && (!(node.headerGroups || node.rowDetails) || fullRowHeight <= freshPageRowHeight)
        ) {
          nextPage();
          drawRepeatedHeaderArtifact();
        }
        const continuationColumns = node.continuationContextColumns
          ?? (node.rowHeaderColumn === undefined ? [0] : [node.rowHeaderColumn]);
        const drawContinuationContext = () => {
          const segments = continuationColumns.map((columnIndex) => {
            const compact = row[columnIndex]!.trim().replace(/\s+/gu, " ");
            const summarized = !node.preserveContinuationContext && compact.length > 96 ? `${compact.slice(0, 95)}…` : compact;
            return `${node.headers[columnIndex]}: ${summarized || "boş"}`;
          });
          const contextLines = wrapText(
            `Devam — ${segments.join(" · ")}`,
            contentWidth - cellPadding * 2,
            tableStyle.fontSize,
            font,
          );
          const contextHeight = contextLines.length * tableStyle.lineHeight + cellPadding * 2;
          if ((node.headerGroups || node.rowDetails) && contextHeight + tableStyle.lineHeight + cellPadding * 2 > contentTop - totalHeaderHeight - contentBottom) {
            throw new Error("PDF tablo devam bağlamı bir veri satırıyla birlikte sayfaya sığmıyor.");
          }
          const page = currentPage();
          const contextTop = page.cursorY;
          addArtifact(
            page,
            `0.97 0.96 0.98 rg\n${pageMargin.toFixed(2)} ${(contextTop - contextHeight).toFixed(2)} `
              + `${contentWidth.toFixed(2)} ${contextHeight.toFixed(2)} re f\n`
              + `0.72 0.69 0.76 RG 0.5 w ${pageMargin.toFixed(2)} `
              + `${(contextTop - contextHeight).toFixed(2)} ${contentWidth.toFixed(2)} `
              + `${contextHeight.toFixed(2)} re S`,
          );
          addMarkedCommands(
            page,
            pageIndex,
            cellStructs[node.rowHeaderColumn ?? continuationColumns[0] ?? 0]!,
            drawTextLines(
              contextLines,
              pageMargin + cellPadding,
              contextTop - tableStyle.fontSize - cellPadding,
              tableStyle,
            ),
          );
          page.cursorY -= contextHeight;
        };
        let lineOffset = 0;
        while (lineOffset < maximumLineCount) {
          let availableLines = Math.floor(
            (currentPage().cursorY - contentBottom - cellPadding * 2) / tableStyle.lineHeight,
          );
          if (availableLines < 1) {
            nextPage();
            drawRepeatedHeaderArtifact();
            availableLines = Math.floor(
              (currentPage().cursorY - contentBottom - cellPadding * 2) / tableStyle.lineHeight,
            );
          }
          const chunkLineCount = Math.min(maximumLineCount - lineOffset, availableLines);
          const rowHeight = chunkLineCount * tableStyle.lineHeight + cellPadding * 2;
          const page = currentPage();
          const rowTop = page.cursorY;
          drawRowBackground(page, rowTop, rowHeight, false);
          cellLines.forEach((lines, columnIndex) => {
            const chunk = lines.slice(lineOffset, lineOffset + chunkLineCount);
            if (chunk.length === 0 || chunk.every((line) => line.length === 0)) return;
            addMarkedCommands(
              page,
              pageIndex,
              cellStructs[columnIndex]!,
              node.fitBodyCellsWithinLines
                ? chunk.map((line, lineIndex) => drawSingleLineCellText(
                  line,
                  columnX[columnIndex]! + cellPadding,
                  rowTop - tableStyle.fontSize - cellPadding - lineIndex * tableStyle.lineHeight,
                  columnWidths[columnIndex]! - cellPadding * 2,
                  tableStyle,
                  font,
                  node.minimumBodyCellHorizontalScale ?? 35,
                )).join("\n")
                : drawTextLines(
                  chunk,
                  columnX[columnIndex]! + cellPadding,
                  rowTop - tableStyle.fontSize - cellPadding,
                  tableStyle,
                ),
            );
          });
          page.cursorY -= rowHeight;
          lineOffset += chunkLineCount;
          if (lineOffset < maximumLineCount) {
            nextPage();
            drawRepeatedHeaderArtifact();
            drawContinuationContext();
          }
        }
        const detailLines = detailLayouts[rowIndex];
        if (detailLines) {
          const detailStruct = attach(attach(table, createStructElement("TR")), createStructElement("TD", { tableColumnSpan: node.headers.length }));
          let detailOffset = 0;
          while (detailOffset < detailLines.length) {
            let available = Math.floor((currentPage().cursorY - contentBottom - cellPadding * 2) / tableStyle.lineHeight);
            const remaining = detailLines.length - detailOffset;
            // Keep a fitting band intact; oversized bands advance by at least one line per page.
            if (available < 1 || (detailOffset === 0 && remaining > available && remaining * tableStyle.lineHeight + cellPadding * 2 <= freshPageRowHeight)) {
              nextPage(); drawRepeatedHeaderArtifact(); drawContinuationContext();
              available = Math.floor((currentPage().cursorY - contentBottom - cellPadding * 2) / tableStyle.lineHeight);
            }
            if (available < 1) throw new Error("PDF ayrıntı bandı için sayfada yeterli alan yok.");
            const count = Math.min(remaining, available);
            const height = count * tableStyle.lineHeight + cellPadding * 2;
            const page = currentPage();
            const top = page.cursorY;
            addArtifact(page, `${theme ? `${rgb(theme.tableDetailFill)} rg ${rgb(theme.tableBorderColor)} RG 0.65 w` : "0.97 0.98 0.97 rg 0.72 0.69 0.76 RG 0.5 w"} ${pageMargin.toFixed(2)} ${(top - height).toFixed(2)} ${contentWidth.toFixed(2)} ${height.toFixed(2)} re B`);
            addMarkedCommands(page, pageIndex, detailStruct, drawTextLines(detailLines.slice(detailOffset, detailOffset + count), pageMargin + cellPadding, top - tableStyle.fontSize - cellPadding, tableStyle));
            page.cursorY -= height;
            detailOffset += count;
            if (detailOffset < detailLines.length) { nextPage(); drawRepeatedHeaderArtifact(); drawContinuationContext(); }
          }
        }
      });
      currentPage().cursorY -= bodyStyle.gap;
      continue;
    }
    const height = Math.min(
      Math.max(node.height ?? 120, 48),
      contentTop - contentBottom,
    );
    ensureSpace(height + bodyStyle.gap);
    const figure = attach(
      documentStruct,
      createStructElement("Figure", { altText: node.altText }),
    );
    const page = currentPage();
    const bottom = page.cursorY - height;
    figureBoxes.push({ pageIndex, x: pageMargin, y: bottom, width: pageWidth - pageMargin * 2, height, altText: node.altText });
    const caption = node.caption?.trim();
    const figureCommands = [
      "0.97 0.96 0.98 rg",
      `${pageMargin.toFixed(2)} ${bottom.toFixed(2)} ${(pageWidth - pageMargin * 2).toFixed(2)} ${height.toFixed(2)} re f`,
      "0.49 0.39 0.61 RG 0.8 w",
      `${pageMargin.toFixed(2)} ${bottom.toFixed(2)} ${(pageWidth - pageMargin * 2).toFixed(2)} ${height.toFixed(2)} re S`,
    ];
    if (caption) {
      const captionLines = wrapText(
        caption,
        pageWidth - pageMargin * 2 - 20,
        bodyStyle.fontSize,
        font,
      );
      figureCommands.push(drawTextLines(
        captionLines,
        pageMargin + 10,
        page.cursorY - bodyStyle.fontSize - 10,
        bodyStyle,
      ));
    }
    addMarkedCommands(page, pageIndex, figure, figureCommands.join("\n"));
    page.cursorY = bottom - bodyStyle.gap;
  }

  pageDrafts.forEach((page, index) => {
    if (document.omitPageFurniture) return;
    const runningHeaderLines = page.headerText ? wrapText(page.headerText, pageWidth - pageMargin * 2, 7.5, font) : [];
    if (runningHeaderLines.length) addArtifact(page, drawTextLines(runningHeaderLines, pageMargin, pageHeight - 14, { ...metaStyle, fontSize: 7.5, lineHeight: 10 }));
    const artifactFooter = document.artifactFooterText?.trim();
    addArtifact(
      page,
      `${theme ? rgb(theme.metaColor) : "0.42 0.39 0.44"} rg\nBT /F0 8 Tf 1 0 0 1 ${pageMargin.toFixed(2)} 28 Tm `
        + `${textHex(artifactFooter ?? "MaarifOS")} Tj `
        + `1 0 0 1 ${(pageWidth - pageMargin - 72).toFixed(2)} 28 Tm `
        + `${textHex(`Sayfa ${index + 1}${document.includeTotalPages ? ` / ${pageDrafts.length}` : ""}`)} Tj ET`,
    );
  });

  const objects: PdfObject[] = [];
  let nextObjectId = 1;
  const reserve = () => nextObjectId++;
  const setObject = (id: number, value: string | Uint8Array) => {
    objects.push({ id, bytes: typeof value === "string" ? encoder.encode(value) : value });
  };
  const catalogId = reserve();
  const pagesId = reserve();
  const pageIds = pageDrafts.map(() => reserve());
  const contentIds = pageDrafts.map(() => reserve());
  const fontFileId = reserve();
  const cidSetId = reserve();
  const fontDescriptorId = reserve();
  const cidToGidMapId = reserve();
  const toUnicodeId = reserve();
  const cidFontId = reserve();
  const type0FontId = reserve();
  const structTreeRootId = reserve();
  const parentTreeId = reserve();
  const metadataId = reserve();
  const infoId = reserve();
  const boldIds = boldFont ? { file: reserve(), descriptor: reserve(), map: reserve(), cid: reserve(), type0: reserve() } : null;

  const structElements = flattenStructElements(documentStruct);
  structElements.forEach((element) => {
    element.objectId = reserve();
  });

  const codePointValues = usedCodePoints(document);
  const cidToGid = createCidToGidMap(codePointValues, font);
  const cidSet = createCidSet(codePointValues);
  const toUnicode = renderToUnicodeCmap(codePointValues);
  setObject(fontFileId, streamObject(`/Length1 ${font.bytes.byteLength}`, font.bytes));
  setObject(cidSetId, streamObject("", cidSet));
  setObject(cidToGidMapId, streamObject("", cidToGid));
  setObject(toUnicodeId, streamObject("", toUnicode));
  setObject(
    fontDescriptorId,
    `<< /Type /FontDescriptor /FontName /Roboto-Regular /Flags 32 /FontBBox [`
      + `${font.bbox.map((value) => scaledFontMetric(value, font)).join(" ")}] `
      + `/ItalicAngle 0 /Ascent ${scaledFontMetric(font.ascent, font)} `
      + `/Descent ${scaledFontMetric(font.descent, font)} /CapHeight ${scaledFontMetric(font.capHeight, font)} `
      + `/StemV 80 /FontFile2 ${fontFileId} 0 R /CIDSet ${cidSetId} 0 R >>`,
  );
  setObject(
    cidFontId,
    `<< /Type /Font /Subtype /CIDFontType2 /BaseFont /Roboto-Regular `
      + `/CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> `
      + `/FontDescriptor ${fontDescriptorId} 0 R /DW 0 /W [${renderWidths(codePointValues, font)}] `
      + `/CIDToGIDMap ${cidToGidMapId} 0 R >>`,
  );
  setObject(
    type0FontId,
    `<< /Type /Font /Subtype /Type0 /BaseFont /Roboto-Regular /Encoding /Identity-H `
      + `/DescendantFonts [${cidFontId} 0 R] /ToUnicode ${toUnicodeId} 0 R >>`,
  );
  if (boldFont && boldIds) {
    setObject(boldIds.file, streamObject(`/Length1 ${boldFont.bytes.byteLength}`, boldFont.bytes));
    setObject(boldIds.map, streamObject("", createCidToGidMap(codePointValues, boldFont)));
    setObject(boldIds.descriptor, `<< /Type /FontDescriptor /FontName /Roboto-Bold /Flags 32 /FontWeight 700 /FontBBox [${boldFont.bbox.map(value => scaledFontMetric(value,boldFont)).join(" ")}] /ItalicAngle 0 /Ascent ${scaledFontMetric(boldFont.ascent,boldFont)} /Descent ${scaledFontMetric(boldFont.descent,boldFont)} /CapHeight ${scaledFontMetric(boldFont.capHeight,boldFont)} /StemV 140 /FontFile2 ${boldIds.file} 0 R /CIDSet ${cidSetId} 0 R >>`);
    setObject(boldIds.cid, `<< /Type /Font /Subtype /CIDFontType2 /BaseFont /Roboto-Bold /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ${boldIds.descriptor} 0 R /DW 0 /W [${renderWidths(codePointValues,boldFont)}] /CIDToGIDMap ${boldIds.map} 0 R >>`);
    setObject(boldIds.type0, `<< /Type /Font /Subtype /Type0 /BaseFont /Roboto-Bold /Encoding /Identity-H /DescendantFonts [${boldIds.cid} 0 R] /ToUnicode ${toUnicodeId} 0 R >>`);
  }

  pageDrafts.forEach((page, index) => {
    const annotationIds = page.links.map(link => {
      const id = reserve();
      setObject(id, `<< /Type /Annot /Subtype /Link /Rect [${link.rect.map(value => value.toFixed(3)).join(" ")}] /Border [0 0 0] /A << /S /URI /URI (${pdfLiteral(link.uri)}) >> >>`);
      return id;
    });
    const content = encoder.encode(page.commands.join("\n"));
    setObject(contentIds[index]!, streamObject("", content));
    setObject(
      pageIds[index]!,
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] `
        + `/Tabs /S /StructParents ${index} `
        + `/Resources << /Font << /F0 ${type0FontId} 0 R${boldIds ? ` /F1 ${boldIds.type0} 0 R` : ""} >> >> `
        + (annotationIds.length ? `/Annots [${annotationIds.map(id => `${id} 0 R`).join(" ")}] ` : "")
        + `/Contents ${contentIds[index]} 0 R >>`,
    );
  });
  setObject(
    pagesId,
    `<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] >>`,
  );

  const structKid = (element: StructElement): string => {
    const childRefs = element.children.map((child) => `${child.objectId} 0 R`);
    const markedRefs = element.markedContent.map((reference) => (
      `<< /Type /MCR /Pg ${pageIds[reference.pageIndex]} 0 R /MCID ${reference.mcid} >>`
    ));
    const refs = [...childRefs, ...markedRefs];
    if (refs.length === 1) return refs[0]!;
    return `[${refs.join(" ")}]`;
  };
  structElements.forEach((element) => {
    const parentId = element.parent?.objectId ?? structTreeRootId;
    const alt = element.altText ? ` /Alt ${utf16Hex(element.altText)}` : "";
    const tableAttributes = [
      element.tableSummary ? `/Summary ${utf16Hex(element.tableSummary)}` : "",
      element.tableHeaderScope ? `/Scope /${element.tableHeaderScope}` : "",
      element.tableColumnSpan !== undefined ? `/ColSpan ${element.tableColumnSpan}` : "",
    ].filter(Boolean).join(" ");
    const attributes = tableAttributes ? ` /A << /O /Table ${tableAttributes} >>` : "";
    setObject(
      element.objectId!,
      `<< /Type /StructElem /S ${pdfNameRole(element.role)} /P ${parentId} 0 R`
        + `${alt}${attributes} /K ${structKid(element)} >>`,
    );
  });

  const parentTreeNumbers = pageDrafts.map((page, index) => (
    `${index} [${page.structParents.map((element) => `${element.objectId} 0 R`).join(" ")}]`
  ));
  setObject(parentTreeId, `<< /Nums [${parentTreeNumbers.join(" ")}] >>`);
  setObject(
    structTreeRootId,
    `<< /Type /StructTreeRoot /K [${documentStruct.objectId} 0 R] `
      + `/ParentTree ${parentTreeId} 0 R /ParentTreeNextKey ${pageDrafts.length} >>`,
  );

  const title = document.title.trim();
  const language = document.language ?? "tr-TR";
  const creator = document.creator?.trim() || "MaarifOS";
  const technicalMetadata = document.technicalMetadata ?? [];
  const technicalMetadataXml = technicalMetadata.length > 0
    ? `<maarifos:technical><rdf:Bag>${technicalMetadata.map((entry) => (
        `<rdf:li maarifos:key="${xmlEscape(entry.key)}">${xmlEscape(entry.value)}</rdf:li>`
      )).join("")}</rdf:Bag></maarifos:technical>`
    : "";
  const xmp = encoder.encode(
    `<?xpacket begin="\ufeff" id="W5M0MpCehiHzreSzNTczkc9d"?>\n`
      + `<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">`
      + `<rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/" `
      + `xmlns:xmp="http://ns.adobe.com/xap/1.0/" `
      + `xmlns:maarifos="https://maarifos.local/ns/pdf/1.0/">`
      + `<dc:title><rdf:Alt><rdf:li xml:lang="${language}">${xmlEscape(title)}</rdf:li></rdf:Alt></dc:title>`
      + `<dc:language><rdf:Bag><rdf:li>${language}</rdf:li></rdf:Bag></dc:language>`
      + `<xmp:CreatorTool>${xmlEscape(creator)}</xmp:CreatorTool>`
      + technicalMetadataXml
      + `</rdf:Description></rdf:RDF></x:xmpmeta>\n<?xpacket end="w"?>`,
  );
  setObject(metadataId, streamObject("/Type /Metadata /Subtype /XML", xmp));
  setObject(
    infoId,
    `<< /Title ${utf16Hex(title)} /Creator ${utf16Hex(creator)} >>`,
  );
  setObject(
    catalogId,
    `<< /Type /Catalog /Pages ${pagesId} 0 R /Lang (${pdfLiteral(language)}) `
      + `/MarkInfo << /Marked true /Suspects false >> `
      + `/StructTreeRoot ${structTreeRootId} 0 R /Metadata ${metadataId} 0 R `
      + `/ViewerPreferences << /DisplayDocTitle true >> >>`,
  );

  const bytes = serializePdfObjects(objects, catalogId, infoId);
  figureBoxesByPdf.set(bytes, figureBoxes);
  registerSemanticPdfPreview(bytes, document, { fontBytes: loadedFont, ...(loadedBoldFont ? {boldFontBytes:loadedBoldFont} : {}) });
  return bytes;
}

/** Üretilmiş ortak motor PDF'sinin sayfa ağacı sayısını güvenli biçimde okur. */
export function semanticTaggedPdfPageCount(bytes: Uint8Array): number {
  const decoded = new TextDecoder("latin1").decode(bytes);
  const match = decoded.match(/\/Type\s*\/Pages\s*\/Count\s+(\d+)\b/u);
  const count = Number(match?.[1]);
  if (!Number.isSafeInteger(count) || count < 1) {
    throw new Error("Semantik PDF sayfa sayısı doğrulanamadı.");
  }
  return count;
}

