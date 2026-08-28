const encoder = new TextEncoder();

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const PAGE_MARGIN = 54;
const CONTENT_TOP = A4_HEIGHT - PAGE_MARGIN;
const CONTENT_BOTTOM = 54;

export const ACCESSIBLE_PDF_FONT_ASSET_PATH =
  "/assets/fonts/MaarifOSSans-Regular.ttf" as const;

export type SemanticPdfHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type SemanticPdfNode =
  | Readonly<{
      kind: "heading";
      level: SemanticPdfHeadingLevel;
      text: string;
      pageBreakBefore?: boolean;
      forcePageBreakBefore?: boolean;
    }>
  | Readonly<{
      kind: "paragraph";
      text: string;
      tone?: "body" | "meta";
      pageBreakBefore?: boolean;
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
      /** Sütunlara ayrılan göreli genişlikler; verilmezse sütunlar eşit genişler. */
      columnWeights?: readonly number[];
      /** Hücre iç boşluğu (pt); dar resmî matrislerde açıkça küçültülebilir. */
      cellPadding?: number;
      /** Gövde satırını ekran okuyucuya bağlayan satır başlığı sütunu. */
      rowHeaderColumn?: number;
      /** Yalnız bir satır tam sayfadan uzunsa devam sayfasında yinelenecek bağlam sütunları. */
      continuationContextColumns?: readonly number[];
      pageBreakBefore?: boolean;
    }>
  | Readonly<{
      kind: "figure";
      altText: string;
      caption?: string;
      height?: number;
      pageBreakBefore?: boolean;
    }>;

export interface SemanticTaggedPdfDocument {
  readonly title: string;
  readonly language?: "tr-TR";
  readonly creator?: string;
  /** Her sayfada semantik okuma ağacının dışında gösterilen kısa güvenlik notu. */
  readonly artifactFooterText?: string;
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
}

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
  cursorY: number;
}

interface TextStyle {
  readonly fontSize: number;
  readonly lineHeight: number;
  readonly gap: number;
  readonly color: readonly [number, number, number];
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

function createPage(): PdfPageDraft {
  return { commands: [], structParents: [], cursorY: CONTENT_TOP };
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
  const commands = [`${rgb(style.color)} rg`, "BT", `/F0 ${style.fontSize} Tf`];
  lines.forEach((line, index) => {
    const y = firstBaseline - index * style.lineHeight;
    commands.push(`1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm ${textHex(line)} Tj`);
  });
  commands.push("ET");
  return commands.join("\n");
}

function validateDocument(document: SemanticTaggedPdfDocument): void {
  if (!document.title.trim()) throw new Error("PDF belge başlığı boş bırakılamaz.");
  if ((document.language ?? "tr-TR") !== "tr-TR") {
    throw new Error("Erişilebilir belge motoru yalnız tr-TR belge dili üretir.");
  }
  if (document.nodes.length === 0) throw new Error("PDF en az bir semantik içerik taşımalıdır.");
  for (const node of document.nodes) {
    if (node.kind === "heading" || node.kind === "paragraph") {
      if (!node.text.trim()) throw new Error("PDF başlık ve paragrafları boş olamaz.");
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

function collectDocumentText(document: SemanticTaggedPdfDocument): string[] {
  return [
    document.title,
    document.artifactFooterText ?? "",
    ...document.nodes.flatMap((node) => {
      if (node.kind === "heading" || node.kind === "paragraph") return [node.text];
      if (node.kind === "list") return node.items;
      if (node.kind === "table") {
        return [node.summary ?? "", ...node.headers, ...node.rows.flat()];
      }
      return [node.altText, node.caption ?? ""];
    }),
    "MaarifOS",
    "Sayfa",
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
  const loadedFont = runtime.fontBytes
    ?? await (runtime.loadFontBytes ?? loadDefaultFontBytes)();
  const font = parseFontMetrics(loadedFont);
  for (const value of collectDocumentText(document)) assertSupportedText(value, font);
  const pageDrafts: PdfPageDraft[] = [createPage()];
  const documentStruct = createStructElement("Document");
  let pageIndex = 0;

  const currentPage = () => pageDrafts[pageIndex]!;
  const nextPage = () => {
    pageDrafts.push(createPage());
    pageIndex += 1;
  };
  const ensureSpace = (height: number, force = false) => {
    if (
      currentPage().cursorY < CONTENT_TOP
      && (force || currentPage().cursorY - height < CONTENT_BOTTOM)
    ) nextPage();
  };
  const applySectionBreak = (force: boolean) => {
    const page = currentPage();
    if (page.cursorY === CONTENT_TOP) return;
    const usedHeight = CONTENT_TOP - page.cursorY;
    const contentHeight = CONTENT_TOP - CONTENT_BOTTOM;
    if (force || usedHeight >= contentHeight * 0.42) nextPage();
  };
  const addTextFlow = (
    struct: StructElement,
    text: string,
    style: TextStyle,
    x = PAGE_MARGIN,
    width = A4_WIDTH - PAGE_MARGIN * 2,
    minimumStartHeight = style.lineHeight,
  ) => {
    const lines = wrapText(text, width, style.fontSize, font);
    ensureSpace(Math.max(minimumStartHeight, style.lineHeight + style.gap));
    let lineIndex = 0;
    while (lineIndex < lines.length) {
      const page = currentPage();
      const availableLines = Math.max(
        1,
        Math.floor((page.cursorY - CONTENT_BOTTOM - style.gap) / style.lineHeight),
      );
      const chunk = lines.slice(lineIndex, lineIndex + availableLines);
      const baseline = page.cursorY - style.fontSize;
      addMarkedCommands(
        page,
        pageIndex,
        struct,
        drawTextLines(chunk, x, baseline, style),
      );
      page.cursorY -= chunk.length * style.lineHeight + style.gap;
      lineIndex += chunk.length;
      if (lineIndex < lines.length) nextPage();
    }
  };

  for (const node of document.nodes) {
    if (node.pageBreakBefore) {
      applySectionBreak(
        "forcePageBreakBefore" in node && node.forcePageBreakBefore === true,
      );
    }
    if (node.kind === "heading") {
      const struct = attach(documentStruct, createStructElement(`H${node.level}`));
      const style = HEADING_STYLES[node.level];
      addTextFlow(
        struct,
        node.text,
        style,
        PAGE_MARGIN,
        A4_WIDTH - PAGE_MARGIN * 2,
        style.lineHeight * 2 + BODY_STYLE.lineHeight * 2,
      );
      continue;
    }
    if (node.kind === "paragraph") {
      const struct = attach(documentStruct, createStructElement("P"));
      addTextFlow(struct, node.text, node.tone === "meta" ? META_STYLE : BODY_STYLE);
      continue;
    }
    if (node.kind === "list") {
      const list = attach(documentStruct, createStructElement("L"));
      node.items.forEach((item, itemIndex) => {
        ensureSpace(BODY_STYLE.lineHeight * 2 + BODY_STYLE.gap);
        const listItem = attach(list, createStructElement("LI"));
        const label = attach(listItem, createStructElement("Lbl"));
        const body = attach(listItem, createStructElement("LBody"));
        const labelText = node.ordered ? `${itemIndex + 1}.` : "•";
        const labelWidth = 22;
        const lines = wrapText(
          item,
          A4_WIDTH - PAGE_MARGIN * 2 - labelWidth,
          BODY_STYLE.fontSize,
          font,
        );
        const startPage = currentPage();
        const baseline = startPage.cursorY - BODY_STYLE.fontSize;
        addMarkedCommands(
          startPage,
          pageIndex,
          label,
          drawTextLines([labelText], PAGE_MARGIN, baseline, BODY_STYLE),
        );
        let lineIndex = 0;
        while (lineIndex < lines.length) {
          const page = currentPage();
          const availableLines = Math.max(
            1,
            Math.floor((page.cursorY - CONTENT_BOTTOM - BODY_STYLE.gap) / BODY_STYLE.lineHeight),
          );
          const chunk = lines.slice(lineIndex, lineIndex + availableLines);
          addMarkedCommands(
            page,
            pageIndex,
            body,
            drawTextLines(
              chunk,
              PAGE_MARGIN + labelWidth,
              page.cursorY - BODY_STYLE.fontSize,
              BODY_STYLE,
            ),
          );
          page.cursorY -= chunk.length * BODY_STYLE.lineHeight + BODY_STYLE.gap;
          lineIndex += chunk.length;
          if (lineIndex < lines.length) nextPage();
        }
      });
      continue;
    }
    if (node.kind === "table") {
      const table = attach(
        documentStruct,
        createStructElement("Table", node.summary ? { tableSummary: node.summary } : {}),
      );
      const contentWidth = A4_WIDTH - PAGE_MARGIN * 2;
      const cellPadding = node.cellPadding ?? 5;
      const weights = node.columnWeights ?? node.headers.map(() => 1);
      const weightTotal = weights.reduce((total, weight) => total + weight, 0);
      const columnWidths = weights.map((weight) => contentWidth * weight / weightTotal);
      const columnX = columnWidths.map((_, columnIndex) => (
        PAGE_MARGIN
        + columnWidths.slice(0, columnIndex).reduce((total, width) => total + width, 0)
      ));
      const headerLines = node.headers.map((header, columnIndex) => wrapText(
        header,
        columnWidths[columnIndex]! - cellPadding * 2,
        META_STYLE.fontSize,
        font,
      ));
      const headerHeight = Math.max(...headerLines.map((lines) => lines.length))
        * META_STYLE.lineHeight + cellPadding * 2;

      const drawRowBackground = (
        page: PdfPageDraft,
        rowTop: number,
        rowHeight: number,
        header: boolean,
      ) => {
        addArtifact(
          page,
          `${header ? "0.94 0.92 0.97 rg" : "1 1 1 rg"}\n`
            + `${PAGE_MARGIN.toFixed(2)} ${(rowTop - rowHeight).toFixed(2)} `
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
        ensureSpace(headerHeight);
        const page = currentPage();
        const rowTop = page.cursorY;
        drawRowBackground(page, rowTop, headerHeight, true);
        const textCommands = headerLines.map((lines, columnIndex) => drawTextLines(
          lines,
          columnX[columnIndex]! + cellPadding,
          rowTop - META_STYLE.fontSize - cellPadding,
          META_STYLE,
        )).join("\n");
        addArtifact(page, textCommands);
        page.cursorY -= headerHeight;
      };

      ensureSpace(headerHeight);
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
            headerTop - META_STYLE.fontSize - cellPadding,
            META_STYLE,
          ),
        );
      });
      headerPage.cursorY -= headerHeight;

      node.rows.forEach((row) => {
        const cellLines = row.map((cell, columnIndex) => wrapText(
          cell,
          columnWidths[columnIndex]! - cellPadding * 2,
          META_STYLE.fontSize,
          font,
        ));
        const maximumLineCount = Math.max(...cellLines.map((lines) => lines.length));
        const rowStruct = attach(table, createStructElement("TR"));
        const cellStructs = row.map((_, columnIndex) => attach(
          rowStruct,
          createStructElement(
            columnIndex === node.rowHeaderColumn ? "TH" : "TD",
            columnIndex === node.rowHeaderColumn ? { tableHeaderScope: "Row" } : {},
          ),
        ));
        const fullRowHeight = maximumLineCount * META_STYLE.lineHeight + cellPadding * 2;
        const freshPageRowHeight = CONTENT_TOP - headerHeight - CONTENT_BOTTOM;
        const currentAvailableHeight = currentPage().cursorY - CONTENT_BOTTOM;
        if (
          fullRowHeight > currentAvailableHeight
          && currentAvailableHeight < freshPageRowHeight - 0.01
        ) {
          nextPage();
          drawRepeatedHeaderArtifact();
        }
        const continuationColumns = node.continuationContextColumns
          ?? (node.rowHeaderColumn === undefined ? [0] : [node.rowHeaderColumn]);
        const drawContinuationContext = () => {
          const segments = continuationColumns.map((columnIndex) => {
            const compact = row[columnIndex]!.trim().replace(/\s+/gu, " ");
            const summarized = compact.length > 96 ? `${compact.slice(0, 95)}…` : compact;
            return `${node.headers[columnIndex]}: ${summarized || "boş"}`;
          });
          const contextLines = wrapText(
            `Devam — ${segments.join(" · ")}`,
            contentWidth - cellPadding * 2,
            META_STYLE.fontSize,
            font,
          );
          const contextHeight = contextLines.length * META_STYLE.lineHeight + cellPadding * 2;
          const page = currentPage();
          const contextTop = page.cursorY;
          addArtifact(
            page,
            `0.97 0.96 0.98 rg\n${PAGE_MARGIN.toFixed(2)} ${(contextTop - contextHeight).toFixed(2)} `
              + `${contentWidth.toFixed(2)} ${contextHeight.toFixed(2)} re f\n`
              + `0.72 0.69 0.76 RG 0.5 w ${PAGE_MARGIN.toFixed(2)} `
              + `${(contextTop - contextHeight).toFixed(2)} ${contentWidth.toFixed(2)} `
              + `${contextHeight.toFixed(2)} re S`,
          );
          addMarkedCommands(
            page,
            pageIndex,
            cellStructs[node.rowHeaderColumn ?? continuationColumns[0] ?? 0]!,
            drawTextLines(
              contextLines,
              PAGE_MARGIN + cellPadding,
              contextTop - META_STYLE.fontSize - cellPadding,
              META_STYLE,
            ),
          );
          page.cursorY -= contextHeight;
        };
        let lineOffset = 0;
        while (lineOffset < maximumLineCount) {
          let availableLines = Math.floor(
            (currentPage().cursorY - CONTENT_BOTTOM - cellPadding * 2) / META_STYLE.lineHeight,
          );
          if (availableLines < 1) {
            nextPage();
            drawRepeatedHeaderArtifact();
            availableLines = Math.floor(
              (currentPage().cursorY - CONTENT_BOTTOM - cellPadding * 2) / META_STYLE.lineHeight,
            );
          }
          const chunkLineCount = Math.min(maximumLineCount - lineOffset, availableLines);
          const rowHeight = chunkLineCount * META_STYLE.lineHeight + cellPadding * 2;
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
              drawTextLines(
                chunk,
                columnX[columnIndex]! + cellPadding,
                rowTop - META_STYLE.fontSize - cellPadding,
                META_STYLE,
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
      });
      currentPage().cursorY -= BODY_STYLE.gap;
      continue;
    }
    const height = Math.min(
      Math.max(node.height ?? 120, 48),
      CONTENT_TOP - CONTENT_BOTTOM,
    );
    ensureSpace(height + BODY_STYLE.gap);
    const figure = attach(
      documentStruct,
      createStructElement("Figure", { altText: node.altText }),
    );
    const page = currentPage();
    const bottom = page.cursorY - height;
    const caption = node.caption?.trim();
    const figureCommands = [
      "0.97 0.96 0.98 rg",
      `${PAGE_MARGIN.toFixed(2)} ${bottom.toFixed(2)} ${(A4_WIDTH - PAGE_MARGIN * 2).toFixed(2)} ${height.toFixed(2)} re f`,
      "0.49 0.39 0.61 RG 0.8 w",
      `${PAGE_MARGIN.toFixed(2)} ${bottom.toFixed(2)} ${(A4_WIDTH - PAGE_MARGIN * 2).toFixed(2)} ${height.toFixed(2)} re S`,
    ];
    if (caption) {
      const captionLines = wrapText(
        caption,
        A4_WIDTH - PAGE_MARGIN * 2 - 20,
        BODY_STYLE.fontSize,
        font,
      );
      figureCommands.push(drawTextLines(
        captionLines,
        PAGE_MARGIN + 10,
        page.cursorY - BODY_STYLE.fontSize - 10,
        BODY_STYLE,
      ));
    }
    addMarkedCommands(page, pageIndex, figure, figureCommands.join("\n"));
    page.cursorY = bottom - BODY_STYLE.gap;
  }

  pageDrafts.forEach((page, index) => {
    const artifactFooter = document.artifactFooterText?.trim();
    addArtifact(
      page,
      `0.42 0.39 0.44 rg\nBT /F0 8 Tf 1 0 0 1 ${PAGE_MARGIN.toFixed(2)} 28 Tm `
        + `${textHex(artifactFooter ?? "MaarifOS")} Tj `
        + `1 0 0 1 ${(A4_WIDTH - PAGE_MARGIN - 72).toFixed(2)} 28 Tm `
        + `${textHex(`Sayfa ${index + 1}`)} Tj ET`,
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

  pageDrafts.forEach((page, index) => {
    const content = encoder.encode(page.commands.join("\n"));
    setObject(contentIds[index]!, streamObject("", content));
    setObject(
      pageIds[index]!,
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${A4_WIDTH} ${A4_HEIGHT}] `
        + `/Tabs /S /StructParents ${index} `
        + `/Resources << /Font << /F0 ${type0FontId} 0 R >> >> `
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

  return serializePdfObjects(objects, catalogId, infoId);
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
