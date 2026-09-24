import { wordDocumentStyles, wordRunningFooter } from "../documents/word-document-design.ts";
import {
  ANECDOTE_FORM_OFFICIAL_SOURCE,
  ANECDOTE_FORM_OFFICIAL_SOURCE_URL,
  ANECDOTE_FORM_OFFICIAL_TITLE,
  assertAnecdoteFormReadyForExport,
  type AnecdoteFormReadModel,
} from "./anecdote-form.ts";
import {
  createSemanticTaggedPdf,
  type SemanticPdfNode,
  type SemanticTaggedPdfRuntime,
} from "../documents/semantic-tagged-pdf.ts";

export type AnecdoteExportFormat = "pdf" | "word";

export interface AnecdoteExportFile {
  format: AnecdoteExportFormat;
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
  observationId: string;
  exportedAt: string;
}

export interface AnecdotePdfRuntime extends SemanticTaggedPdfRuntime {
  createCanvas?: () => HTMLCanvasElement;
  waitForFonts?: () => Promise<void>;
}

const encoder = new TextEncoder();
const A4_CANVAS_WIDTH = 1240;
const A4_CANVAS_HEIGHT = 1754;
const ANECDOTE_INTRO =
  "Günlük plan kapsamında etkinlikler gerçekleştirildikten sonra günlük, haftalık ve/veya özel bir durum gözlemlendiğinde anekdot kaydı tutulabilir. Bu form, gözlenen özel durumu ve öğretmenin değerlendirmesini ayrı kanıt katmanlarında korur.";
const ANECDOTE_OBSERVED_SITUATION_LABEL =
  "Gözlenen Durum — ham gözlem ve çocuğun sözü";
const ANECDOTE_OBSERVER_ASSESSMENT_LABEL =
  "Gözlemcinin Genel Değerlendirmesi — öğretmen yorumu";
const ANECDOTE_RAW_OBSERVATION_NOTE =
  "Aşağıdaki metin ham gözlem kaydıdır; çocuğun doğrudan sözü yorum eklenmeden bu kayıt içinde korunur.";
const ANECDOTE_SOURCE_CITATION =
  `${ANECDOTE_FORM_OFFICIAL_SOURCE} · ${ANECDOTE_FORM_OFFICIAL_SOURCE_URL}`;

function xmlEscape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function pdfStringEscape(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)")
    .replaceAll("\r", " ")
    .replaceAll("\n", " ");
}

function littleEndian(value: number, length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  for (let index = 0; index < length; index += 1) {
    bytes[index] = (value >>> (index * 8)) & 0xff;
  }
  return bytes;
}

function joinBytes(parts: readonly Uint8Array[]): Uint8Array {
  const output = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createZip(
  files: readonly { name: string; contents: string }[],
): Uint8Array {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const name = encoder.encode(file.name);
    const data = encoder.encode(file.contents);
    const checksum = crc32(data);
    const local = joinBytes([
      littleEndian(0x04034b50, 4),
      littleEndian(20, 2),
      littleEndian(0x0800, 2),
      littleEndian(0, 2),
      littleEndian(0, 2),
      littleEndian(33, 2),
      littleEndian(checksum, 4),
      littleEndian(data.length, 4),
      littleEndian(data.length, 4),
      littleEndian(name.length, 2),
      littleEndian(0, 2),
      name,
      data,
    ]);
    localParts.push(local);
    centralParts.push(
      joinBytes([
        littleEndian(0x02014b50, 4),
        littleEndian(20, 2),
        littleEndian(20, 2),
        littleEndian(0x0800, 2),
        littleEndian(0, 2),
        littleEndian(0, 2),
        littleEndian(33, 2),
        littleEndian(checksum, 4),
        littleEndian(data.length, 4),
        littleEndian(data.length, 4),
        littleEndian(name.length, 2),
        littleEndian(0, 2),
        littleEndian(0, 2),
        littleEndian(0, 2),
        littleEndian(0, 2),
        littleEndian(0, 4),
        littleEndian(offset, 4),
        name,
      ]),
    );
    offset += local.length;
  }
  const central = joinBytes(centralParts);
  return joinBytes([
    ...localParts,
    central,
    littleEndian(0x06054b50, 4),
    littleEndian(0, 2),
    littleEndian(0, 2),
    littleEndian(files.length, 2),
    littleEndian(files.length, 2),
    littleEndian(central.length, 4),
    littleEndian(offset, 4),
    littleEndian(0, 2),
  ]);
}

function turkishDate(civilDate: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${civilDate}T12:00:00.000Z`));
}

function safeFileSegment(value: string): string {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "_")
    .slice(0, 80) || "Cocuk";
}

function skillsText(model: AnecdoteFormReadModel): string {
  return model.observedSkills
    .map((skill) => `${skill.referenceCode} - ${skill.referenceTitle}`)
    .join("\n");
}

function wordRunsForText(text: string, options: { bold?: boolean } = {}): string {
  const values = text.split("\n");
  return values
    .map(
      (line, index) =>
        `${index > 0 ? "<w:br/>" : ""}<w:t xml:space="preserve">${xmlEscape(line)}</w:t>`,
    )
    .join("");
}

function wordParagraph(
  text: string,
  options: {
    style?: string;
    bold?: boolean;
    color?: string;
    sizeHalfPoints?: number;
    align?: "left" | "center";
    keepNext?: boolean;
    beforeTwips?: number;
    afterTwips?: number;
  } = {},
): string {
  const paragraphProperties = [
    options.style ? `<w:pStyle w:val="${options.style}"/>` : "",
    options.keepNext ? "<w:keepNext/>" : "",
    options.beforeTwips !== undefined || options.afterTwips !== undefined
      ? `<w:spacing w:before="${options.beforeTwips ?? 0}" w:after="${options.afterTwips ?? 0}"/>`
      : "",
    options.align ? `<w:jc w:val="${options.align}"/>` : "",
  ].join("");
  const runProperties = [
    options.bold ? "<w:b/>" : "",
    options.color ? `<w:color w:val="${options.color}"/>` : "",
    options.sizeHalfPoints
      ? `<w:sz w:val="${options.sizeHalfPoints}"/><w:szCs w:val="${options.sizeHalfPoints}"/>`
      : "",
  ].join("");
  return `<w:p><w:pPr>${paragraphProperties}</w:pPr><w:r><w:rPr>${runProperties}</w:rPr>${wordRunsForText(text)}</w:r></w:p>`;
}

function tableCell(
  contents: string,
  options: {
    width: number;
    gridSpan?: 2;
    fill?: string;
    verticalAlign?: "center" | "top";
  },
): string {
  return `<w:tc><w:tcPr><w:tcW w:w="${options.width}" w:type="dxa"/>${
    options.gridSpan ? `<w:gridSpan w:val="${options.gridSpan}"/>` : ""
  }${options.fill ? `<w:shd w:fill="${options.fill}"/>` : ""}<w:tcMar><w:top w:w="140" w:type="dxa"/><w:left w:w="140" w:type="dxa"/><w:bottom w:w="140" w:type="dxa"/><w:right w:w="140" w:type="dxa"/></w:tcMar><w:vAlign w:val="${
    options.verticalAlign ?? "top"
  }"/></w:tcPr>${contents}</w:tc>`;
}

function tableRow(
  cells: string,
  options: { minimumHeight?: number; keepTogether?: boolean; repeatHeader?: boolean } = {},
): string {
  return `<w:tr><w:trPr>${
    (options.keepTogether ? "<w:cantSplit/>" : "") + (options.repeatHeader ? "<w:tblHeader/>" : "")
  }${
    options.minimumHeight
      ? `<w:trHeight w:val="${options.minimumHeight}" w:hRule="atLeast"/>`
      : ""
  }</w:trPr>${cells}</w:tr>`;
}

function customProperty(
  propertyId: number,
  name: string,
  value: string,
): string {
  return `<property fmtid="{D5CDD505-2E9C-101B-9397-08002B2CF9AE}" pid="${propertyId}" name="${xmlEscape(name)}"><vt:lpwstr>${xmlEscape(value)}</vt:lpwstr></property>`;
}

export function createAnecdoteDocx(
  model: AnecdoteFormReadModel,
  options: { exportedAt?: string } = {},
): Uint8Array {
  assertAnecdoteFormReadyForExport(model);
  const exportedAt = options.exportedAt ?? new Date().toISOString();
  const labelWidth = 2200;
  const valueWidth = 7960;
  const fullWidth = labelWidth + valueWidth;
  const metadataRows = [
    ["Çocuğun Adı Soyadı", model.childFullName],
    ["Tarih", turkishDate(model.civilDate)],
    ["Gözlenen Mekân", model.observedLocation],
  ]
    .map(([label, value]) =>
      tableRow(
        tableCell(wordParagraph(label, { bold: true }), {
          width: labelWidth,
          verticalAlign: "center",
        }) +
          tableCell(wordParagraph(value), {
            width: valueWidth,
            verticalAlign: "center",
          }),
        { minimumHeight: 560, keepTogether: true, repeatHeader: true },
      ),
    )
    .join("");
  const section = (
    label: string,
    value: string,
    minimumHeight: number,
    note?: string,
    valueFill?: string,
  ) =>
    tableRow(
      tableCell(
        wordParagraph(label, { style: "Heading1", bold: true, keepNext: true }) +
          (note ? wordParagraph(note, { keepNext: true }) : ""),
        { width: fullWidth, gridSpan: 2, fill: "CFEFEB" },
      ),
      { keepTogether: true },
    ) +
    tableRow(
      tableCell(wordParagraph(value), {
        width: fullWidth,
        gridSpan: 2,
        ...(valueFill ? { fill: valueFill } : {}),
      }),
      { minimumHeight },
    );
  const tableXml = `<w:tbl><w:tblPr><w:tblW w:w="${fullWidth}" w:type="dxa"/><w:tblInd w:w="120" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="D9D9D9"/><w:left w:val="single" w:sz="4" w:color="D9D9D9"/><w:bottom w:val="single" w:sz="4" w:color="D9D9D9"/><w:right w:val="single" w:sz="4" w:color="D9D9D9"/><w:insideH w:val="single" w:sz="4" w:color="D9D9D9"/><w:insideV w:val="single" w:sz="4" w:color="D9D9D9"/></w:tblBorders></w:tblPr><w:tblGrid><w:gridCol w:w="${labelWidth}"/><w:gridCol w:w="${valueWidth}"/></w:tblGrid>${metadataRows}${section(
    ANECDOTE_OBSERVED_SITUATION_LABEL,
    model.observedSituation,
    1000,
    `(Bu formu doldurmanıza neden olan durumu açıklamanız beklenmektedir.) ${ANECDOTE_RAW_OBSERVATION_NOTE}`,
  )}${section(
    "Gözlenen Beceriler",
    skillsText(model),
    1000,
  )}${section(
    ANECDOTE_OBSERVER_ASSESSMENT_LABEL,
    model.observerGeneralAssessment,
    1200,
  )}</w:tbl>`;
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${wordParagraph(
    ANECDOTE_FORM_OFFICIAL_TITLE,
    {
      style: "Title",
      bold: true,
      color: "000000",
      sizeHalfPoints: 34,
      align: "center",
      afterTwips: 360,
    },
  )}${wordParagraph("Sayın Öğretmen,", {
    style: "FormBody",
    bold: true,
    afterTwips: 180,
  })}${wordParagraph(ANECDOTE_INTRO, {
    style: "FormBody",
    afterTwips: 420,
  })}${tableXml}${wordParagraph("Kaynak", {
    bold: true,
    color: "17324D",
    keepNext: true,
    beforeTwips: 220,
    afterTwips: 80,
  })}${wordParagraph(ANECDOTE_SOURCE_CITATION, {
    color: "466278",
    sizeHalfPoints: 17,
    afterTwips: 0,
  })}<w:sectPr><w:footerReference w:type="default" r:id="rIdFooter"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="360" w:footer="360"/></w:sectPr></w:body></w:document>`;
  const stylesXml = wordDocumentStyles(21, true);
  const coreProperties = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xmlEscape(
    ANECDOTE_FORM_OFFICIAL_TITLE,
  )}</dc:title><dc:subject>${xmlEscape(
    ANECDOTE_FORM_OFFICIAL_SOURCE,
  )}</dc:subject><dc:creator>MaarifOS</dc:creator><cp:lastModifiedBy>MaarifOS</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${xmlEscape(
    exportedAt,
  )}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${xmlEscape(
    exportedAt,
  )}</dcterms:modified></cp:coreProperties>`;
  const customProperties = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/custom-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">${customProperty(
    2,
    "MaarifOSObservationId",
    model.observationId,
  )}${customProperty(
    3,
    "MaarifOSProgramSourceVersions",
    model.programSourceVersions.join(","),
  )}${customProperty(4, "MaarifOSExportedAt", exportedAt)}${customProperty(
    5,
    "OfficialFormSource",
    `${ANECDOTE_FORM_OFFICIAL_SOURCE} | ${ANECDOTE_FORM_OFFICIAL_SOURCE_URL}`,
  )}</Properties>`;
  return createZip([
    {
      name: "[Content_Types].xml",
      contents:
        '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/custom.xml" ContentType="application/vnd.openxmlformats-officedocument.custom-properties+xml"/></Types>',
    },
    {
      name: "_rels/.rels",
      contents:
        '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/custom-properties" Target="docProps/custom.xml"/></Relationships>',
    },
    { name: "word/document.xml", contents: documentXml },
    { name: "word/styles.xml", contents: stylesXml },
    { name: "word/footer1.xml", contents: wordRunningFooter(`MaarifOS · Gözlem formu · ${turkishDate(model.civilDate)}`) },
    { name: "word/settings.xml", contents: '<?xml version="1.0" encoding="UTF-8"?><w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:updateFields w:val="true"/></w:settings>' },
    {
      name: "word/_rels/document.xml.rels",
      contents:
        '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/><Relationship Id="rIdSettings" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
    },
    { name: "docProps/core.xml", contents: coreProperties },
    { name: "docProps/custom.xml", contents: customProperties },
  ]);
}

function base64Bytes(dataUrl: string): Uint8Array {
  const binary = atob(dataUrl.slice(dataUrl.indexOf(",") + 1));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function createImagePdf(
  images: readonly Uint8Array[],
  trace: { observationId: string; sourceVersions: readonly string[]; exportedAt: string },
): Uint8Array {
  const objects: { id: number; bytes: Uint8Array }[] = [];
  const pageIds = images.map((_, index) => 3 + index * 3);
  const infoId = 3 + images.length * 3;
  objects.push({ id: 1, bytes: encoder.encode("<< /Type /Catalog /Pages 2 0 R >>") });
  objects.push({
    id: 2,
    bytes: encoder.encode(
      `<< /Type /Pages /Count ${images.length} /Kids [${pageIds
        .map((id) => `${id} 0 R`)
        .join(" ")}] >>`,
    ),
  });
  images.forEach((image, index) => {
    const pageId = pageIds[index];
    const imageId = pageId + 1;
    const contentId = pageId + 2;
    const content = encoder.encode(
      "q\n595.28 0 0 841.89 0 0 cm\n/Im0 Do\nQ",
    );
    objects.push({
      id: pageId,
      bytes: encoder.encode(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`,
      ),
    });
    objects.push({
      id: imageId,
      bytes: joinBytes([
        encoder.encode(
          `<< /Type /XObject /Subtype /Image /Width ${A4_CANVAS_WIDTH} /Height ${A4_CANVAS_HEIGHT} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.length} >>\nstream\n`,
        ),
        image,
        encoder.encode("\nendstream"),
      ]),
    });
    objects.push({
      id: contentId,
      bytes: joinBytes([
        encoder.encode(`<< /Length ${content.length} >>\nstream\n`),
        content,
        encoder.encode("\nendstream"),
      ]),
    });
  });
  const subject = pdfStringEscape(
    `observationId=${trace.observationId}; programSourceVersions=${trace.sourceVersions.join(",")}; exportedAt=${trace.exportedAt}`,
  );
  objects.push({
    id: infoId,
    bytes: encoder.encode(
      `<< /Title (MaarifOS Anecdote Form) /Subject (${subject}) /Creator (MaarifOS) >>`,
    ),
  });
  objects.sort((left, right) => left.id - right.id);
  const parts: Uint8Array[] = [encoder.encode("%PDF-1.4\n")];
  const offsets = new Map<number, number>();
  let offset = parts[0].length;
  for (const object of objects) {
    const prefix = encoder.encode(`${object.id} 0 obj\n`);
    const suffix = encoder.encode("\nendobj\n");
    offsets.set(object.id, offset);
    parts.push(prefix, object.bytes, suffix);
    offset += prefix.length + object.bytes.length + suffix.length;
  }
  const xrefOffset = offset;
  const maxId = objects.at(-1)?.id ?? 0;
  const xref = [`xref\n0 ${maxId + 1}\n`, "0000000000 65535 f \n"];
  for (let id = 1; id <= maxId; id += 1) {
    xref.push(`${String(offsets.get(id) ?? 0).padStart(10, "0")} 00000 n \n`);
  }
  parts.push(
    encoder.encode(
      `${xref.join("")}trailer\n<< /Size ${maxId + 1} /Root 1 0 R /Info ${infoId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`,
    ),
  );
  return joinBytes(parts);
}

function wrapCanvasText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const explicitLines = text.split("\n");
  const lines: string[] = [];
  for (const explicitLine of explicitLines) {
    const words = explicitLine.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && context.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
  }
  return lines.length > 0 ? lines : [""];
}

export async function createAnecdotePdf(
  model: AnecdoteFormReadModel,
  options: { exportedAt?: string; runtime?: AnecdotePdfRuntime } = {},
): Promise<Uint8Array> {
  assertAnecdoteFormReadyForExport(model);
  const nodes: SemanticPdfNode[] = [
    { kind: "heading", level: 1, text: ANECDOTE_FORM_OFFICIAL_TITLE },
    { kind: "heading", level: 2, text: "Sayın Öğretmen" },
    { kind: "paragraph", text: ANECDOTE_INTRO },
    {
      kind: "table",
      summary: "Çocuk, tarih ve gözlem mekânı bilgileri",
      headers: ["Form alanı", "Kayıt"],
      columnWeights: [1, 3],
      rowHeaderColumn: 0,
      rows: [
        ["Çocuğun Adı Soyadı", model.childFullName],
        ["Tarih", turkishDate(model.civilDate)],
        ["Gözlenen Mekân", model.observedLocation],
      ],
    },
    { kind: "heading", level: 2, text: ANECDOTE_OBSERVED_SITUATION_LABEL },
    {
      kind: "paragraph",
      tone: "meta",
      text: ANECDOTE_RAW_OBSERVATION_NOTE,
    },
    { kind: "paragraph", text: model.observedSituation },
    { kind: "heading", level: 2, text: "Gözlenen Beceriler" },
    {
      kind: "list",
      items: model.observedSkills.map(
        (skill) => `${skill.referenceCode} - ${skill.referenceTitle}`,
      ),
    },
    {
      kind: "heading",
      level: 2,
      text: ANECDOTE_OBSERVER_ASSESSMENT_LABEL,
    },
    { kind: "paragraph", text: model.observerGeneralAssessment },
    { kind: "heading", level: 2, text: "Kaynak" },
    {
      kind: "paragraph",
      tone: "meta",
      text: ANECDOTE_SOURCE_CITATION,
    },
  ];
  return createSemanticTaggedPdf(
    {
      title: ANECDOTE_FORM_OFFICIAL_TITLE,
      language: "tr-TR",
      creator: "MaarifOS",
      nodes,
    },
    options.runtime,
  );
}

export async function generateAnecdoteExportFile(
  model: AnecdoteFormReadModel,
  format: AnecdoteExportFormat,
  options: { exportedAt?: string; pdfRuntime?: AnecdotePdfRuntime } = {},
): Promise<AnecdoteExportFile> {
  assertAnecdoteFormReadyForExport(model);
  if (format !== "pdf" && format !== "word") {
    throw new Error("Anekdot dışa aktarma biçimi PDF veya Word olmalıdır.");
  }
  const exportedAt = options.exportedAt ?? new Date().toISOString();
  const extension = format === "pdf" ? "pdf" : "docx";
  const bytes =
    format === "pdf"
      ? await createAnecdotePdf(model, {
          exportedAt,
          runtime: options.pdfRuntime,
        })
      : createAnecdoteDocx(model, { exportedAt });
  return {
    format,
    fileName: `MaarifOS_Anekdot_Kayit_Formu_${safeFileSegment(
      model.childFullName,
    )}_${model.civilDate}.${extension}`,
    mimeType:
      format === "pdf"
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    bytes,
    observationId: model.observationId,
    exportedAt,
  };
}

