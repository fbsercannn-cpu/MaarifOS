import {
  ANECDOTE_FORM_OFFICIAL_SOURCE,
  ANECDOTE_FORM_OFFICIAL_SOURCE_URL,
  ANECDOTE_FORM_OFFICIAL_TITLE,
  assertAnecdoteFormReadyForExport,
  type AnecdoteFormReadModel,
} from "./anecdote-form.ts";

export type AnecdoteExportFormat = "pdf" | "word";

export interface AnecdoteExportFile {
  format: AnecdoteExportFormat;
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
  observationId: string;
  exportedAt: string;
}

export interface AnecdotePdfRuntime {
  createCanvas?: () => HTMLCanvasElement;
  waitForFonts?: () => Promise<void>;
}

const encoder = new TextEncoder();
const A4_CANVAS_WIDTH = 1240;
const A4_CANVAS_HEIGHT = 1754;

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
    options.align ? `<w:jc w:val="${options.align}"/>` : "",
    options.keepNext ? "<w:keepNext/>" : "",
    options.beforeTwips !== undefined || options.afterTwips !== undefined
      ? `<w:spacing w:before="${options.beforeTwips ?? 0}" w:after="${options.afterTwips ?? 0}"/>`
      : "",
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
  }${options.fill ? `<w:shd w:fill="${options.fill}"/>` : ""}<w:vAlign w:val="${
    options.verticalAlign ?? "top"
  }"/><w:tcMar><w:top w:w="140" w:type="dxa"/><w:left w:w="140" w:type="dxa"/><w:bottom w:w="140" w:type="dxa"/><w:right w:w="140" w:type="dxa"/></w:tcMar></w:tcPr>${contents}</w:tc>`;
}

function tableRow(
  cells: string,
  options: { minimumHeight?: number; keepTogether?: boolean } = {},
): string {
  return `<w:tr><w:trPr>${
    options.minimumHeight
      ? `<w:trHeight w:val="${options.minimumHeight}" w:hRule="atLeast"/>`
      : ""
  }${options.keepTogether ? "<w:cantSplit/>" : ""}</w:trPr>${cells}</w:tr>`;
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
  const intro =
    "Günlük plan kapsamında etkinlikler gerçekleştirildikten sonra günlük, haftalık ve/veya özel bir durum gözlemlendiğinde anekdot kaydı tutmanız beklenmektedir. Bu form olumlu ya da olumsuz özel durumların ortaya çıkması durumunda öğretmen tarafından istenildiği zaman doldurulabilir.";
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
        { minimumHeight: 700, keepTogether: true },
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
        wordParagraph(label, { bold: true, keepNext: true }) +
          (note ? wordParagraph(note, { keepNext: true }) : ""),
        { width: fullWidth, gridSpan: 2, fill: "F2DCD3" },
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
  const tableXml = `<w:tbl><w:tblPr><w:tblW w:w="${fullWidth}" w:type="dxa"/><w:tblInd w:w="120" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="B7B7B7"/><w:left w:val="single" w:sz="4" w:color="B7B7B7"/><w:bottom w:val="single" w:sz="4" w:color="B7B7B7"/><w:right w:val="single" w:sz="4" w:color="B7B7B7"/><w:insideH w:val="single" w:sz="4" w:color="B7B7B7"/><w:insideV w:val="single" w:sz="4" w:color="B7B7B7"/></w:tblBorders></w:tblPr><w:tblGrid><w:gridCol w:w="${labelWidth}"/><w:gridCol w:w="${valueWidth}"/></w:tblGrid>${metadataRows}${section(
    "Gözlenen Durum",
    model.observedSituation,
    1650,
    "(Bu formu doldurmanıza neden olan durumu açıklamanız beklenmektedir.)",
  )}${section(
    "Gözlenen Beceriler",
    skillsText(model),
    1800,
  )}${section(
    "Gözlemcinin Genel Değerlendirmesi",
    model.observerGeneralAssessment,
    2200,
  )}</w:tbl>`;
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${wordParagraph(
    ANECDOTE_FORM_OFFICIAL_TITLE,
    {
      style: "FormTitle",
      bold: true,
      color: "F04B13",
      sizeHalfPoints: 34,
      align: "center",
      afterTwips: 360,
    },
  )}${wordParagraph("Sayın Öğretmen,", {
    style: "FormBody",
    bold: true,
    afterTwips: 180,
  })}${wordParagraph(intro, {
    style: "FormBody",
    afterTwips: 420,
  })}${tableXml}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="360" w:footer="360"/></w:sectPr></w:body></w:document>`;
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Arial" w:cs="Arial"/><w:sz w:val="21"/><w:szCs w:val="21"/><w:lang w:val="tr-TR"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:before="0" w:after="80" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:before="0" w:after="80" w:line="276" w:lineRule="auto"/></w:pPr><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Arial" w:cs="Arial"/><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="FormTitle"><w:name w:val="Form Title"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="360" w:line="360" w:lineRule="auto"/><w:keepNext/></w:pPr><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Arial" w:cs="Arial"/><w:b/><w:color w:val="F04B13"/><w:sz w:val="34"/><w:szCs w:val="34"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="FormBody"><w:name w:val="Form Body"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:before="0" w:after="120" w:line="276" w:lineRule="auto"/></w:pPr><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Arial" w:cs="Arial"/><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr></w:style></w:styles>`;
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
        '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/custom.xml" ContentType="application/vnd.openxmlformats-officedocument.custom-properties+xml"/></Types>',
    },
    {
      name: "_rels/.rels",
      contents:
        '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/custom-properties" Target="docProps/custom.xml"/></Relationships>',
    },
    { name: "word/document.xml", contents: documentXml },
    { name: "word/styles.xml", contents: stylesXml },
    {
      name: "word/_rels/document.xml.rels",
      contents:
        '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
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
  const exportedAt = options.exportedAt ?? new Date().toISOString();
  if (!options.runtime?.createCanvas && typeof document === "undefined") {
    throw new Error("PDF yalnız belge üretimini destekleyen uygulama ortamında hazırlanabilir.");
  }
  if (options.runtime?.waitForFonts) {
    await options.runtime.waitForFonts();
  } else if (typeof document !== "undefined") {
    await document.fonts?.ready;
  }
  const canvas = options.runtime?.createCanvas
    ? options.runtime.createCanvas()
    : document.createElement("canvas");
  canvas.width = A4_CANVAS_WIDTH;
  canvas.height = A4_CANVAS_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("PDF sayfa yüzeyi hazırlanamadı.");
  const images: Uint8Array[] = [];
  const pageMargin = 76;
  const contentWidth = canvas.width - pageMargin * 2;
  const pageBottom = canvas.height - 72;
  const borderColor = "#b7b7b7";
  const peach = "#f2dcd3";
  let y = pageMargin;
  let pageStarted = false;

  const beginPage = (first: boolean) => {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.textAlign = "left";
    y = pageMargin;
    context.fillStyle = "#f04b13";
    context.font = '700 30px Arial, sans-serif';
    context.textAlign = "center";
    context.fillText(ANECDOTE_FORM_OFFICIAL_TITLE, canvas.width / 2, y + 24);
    context.textAlign = "left";
    y += 66;
    if (first) {
      context.fillStyle = "#242424";
      context.font = '700 21px Arial, sans-serif';
      context.fillText("Sayın Öğretmen,", pageMargin, y + 20);
      y += 48;
      context.font = '400 19px Arial, sans-serif';
      const intro =
        "Günlük plan kapsamında etkinlikler gerçekleştirildikten sonra günlük, haftalık ve/veya özel bir durum gözlemlendiğinde anekdot kaydı tutmanız beklenmektedir. Bu form olumlu ya da olumsuz özel durumların ortaya çıkması durumunda öğretmen tarafından istenildiği zaman doldurulabilir.";
      const lines = wrapCanvasText(context, intro, contentWidth);
      for (const line of lines) {
        context.fillText(line, pageMargin, y + 20);
        y += 28;
      }
      y += 28;
    }
    pageStarted = true;
  };
  const finishPage = () => {
    images.push(base64Bytes(canvas.toDataURL("image/jpeg", 0.94)));
    pageStarted = false;
  };
  const ensureSpace = (height: number) => {
    if (!pageStarted) beginPage(images.length === 0);
    if (y + height <= pageBottom) return;
    finishPage();
    beginPage(false);
  };
  const drawBorder = (x: number, top: number, width: number, height: number) => {
    context.strokeStyle = borderColor;
    context.lineWidth = 1;
    context.strokeRect(x, top, width, height);
  };
  const drawMetadataRow = (label: string, value: string) => {
    context.font = '400 20px Arial, sans-serif';
    const valueLines = wrapCanvasText(context, value, contentWidth - 300);
    const height = Math.max(64, valueLines.length * 28 + 24);
    ensureSpace(height);
    const labelWidth = 250;
    drawBorder(pageMargin, y, labelWidth, height);
    drawBorder(pageMargin + labelWidth, y, contentWidth - labelWidth, height);
    context.fillStyle = "#242424";
    context.font = '700 20px Arial, sans-serif';
    context.fillText(label, pageMargin + 14, y + 37);
    context.font = '400 20px Arial, sans-serif';
    valueLines.forEach((line, index) => {
      context.fillText(
        line,
        pageMargin + labelWidth + 14,
        y + 32 + index * 28,
      );
    });
    y += height;
  };
  const drawSectionHeader = (label: string, note?: string) => {
    const height = note ? 80 : 58;
    ensureSpace(height + 80);
    context.fillStyle = peach;
    context.fillRect(pageMargin, y, contentWidth, height);
    drawBorder(pageMargin, y, contentWidth, height);
    context.fillStyle = "#242424";
    context.font = '700 20px Arial, sans-serif';
    context.fillText(label, pageMargin + 14, y + 30);
    if (note) {
      context.font = '400 18px Arial, sans-serif';
      context.fillText(note, pageMargin + 14, y + 58);
    }
    y += height;
  };
  const drawSection = (
    label: string,
    value: string,
    minimumHeight: number,
    note?: string,
    valueFill?: string,
  ) => {
    context.font = '400 19px Arial, sans-serif';
    const lines = wrapCanvasText(context, value, contentWidth - 28);
    let lineIndex = 0;
    let firstChunk = true;
    while (lineIndex < lines.length || firstChunk) {
      drawSectionHeader(label, note);
      const availableHeight = pageBottom - y;
      const maximumLines = Math.max(1, Math.floor((availableHeight - 28) / 27));
      const chunk = lines.slice(lineIndex, lineIndex + maximumLines);
      const hasMore = lineIndex + chunk.length < lines.length;
      const desiredHeight = Math.max(
        firstChunk && !hasMore ? minimumHeight : 70,
        chunk.length * 27 + 28,
      );
      const height = Math.min(availableHeight, desiredHeight);
      if (valueFill) {
        context.fillStyle = valueFill;
        context.fillRect(pageMargin, y, contentWidth, height);
      }
      drawBorder(pageMargin, y, contentWidth, height);
      context.fillStyle = "#242424";
      context.font = '400 19px Arial, sans-serif';
      chunk.forEach((line, index) => {
        context.fillText(line, pageMargin + 14, y + 28 + index * 27);
      });
      y += height;
      lineIndex += chunk.length;
      firstChunk = false;
      if (lineIndex < lines.length) {
        finishPage();
        beginPage(false);
      }
    }
  };

  beginPage(true);
  drawMetadataRow("Çocuğun Adı Soyadı", model.childFullName);
  drawMetadataRow("Tarih", turkishDate(model.civilDate));
  drawMetadataRow("Gözlenen Mekân", model.observedLocation);
  drawSection(
    "Gözlenen Durum",
    model.observedSituation,
    210,
    "(Bu formu doldurmanıza neden olan durumu açıklamanız beklenmektedir.)",
  );
  drawSection(
    "Gözlenen Beceriler",
    skillsText(model),
    235,
  );
  drawSection(
    "Gözlemcinin Genel Değerlendirmesi",
    model.observerGeneralAssessment,
    270,
  );
  if (pageStarted) finishPage();
  return createImagePdf(images, {
    observationId: model.observationId,
    sourceVersions: model.programSourceVersions,
    exportedAt,
  });
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
