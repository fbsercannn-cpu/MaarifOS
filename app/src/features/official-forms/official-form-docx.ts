import { createBinaryZip } from "../documents/binary-zip.ts";
import { wordDocumentStyles, wordXmlText } from "../documents/word-document-design.ts";
export interface OfficialWordCell { text: string; colSpan?: number; rowSpan?: number; header?: boolean }
export type OfficialWordBlock = { kind: "paragraph"; text: string } | { kind: "table"; rows: (string | OfficialWordCell)[][]; columnWeights?: number[]; headerRows?: number };
export function createOfficialFormDocx(title: string, blocks: OfficialWordBlock[], provenance: string, landscape = false): Uint8Array {
  const xml = (text: string) => wordXmlText(text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ""));
  const paragraph = (text: string, style = "Normal") => `<w:p><w:pPr><w:pStyle w:val="${style}"/></w:pPr>${text.split(/\r?\n/).map((line, index) => `<w:r>${index ? "<w:br/>" : ""}<w:t xml:space="preserve">${xml(line)}</w:t></w:r>`).join("")}</w:p>`;
  const table = (block: Extract<OfficialWordBlock, { kind: "table" }>) => {
    const rows = block.rows.map(row => row.map(cell => typeof cell === "string" ? {text:cell} : cell));
    const columns = Math.max(1, ...rows.map(row => row.reduce((sum, cell) => sum + (cell.colSpan || 1), 0)));
    const available = (landscape ? 16838 : 11906) - 1440;
    const weights = Array.from({length: columns}, (_, i) => Math.max(0.01, block.columnWeights?.[i] || 1));
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    const widths = weights.map(weight => Math.floor(available * weight / total));
    widths[widths.length - 1] += available - widths.reduce((sum, width) => sum + width, 0);
    const cellXml = (cell: OfficialWordCell, column: number, continuation = false) => {
      const span = cell.colSpan || 1;
      const width = widths.slice(column, column + span).reduce((sum, value) => sum + value, 0);
      return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${span > 1 ? `<w:gridSpan w:val="${span}"/>` : ""}${continuation ? '<w:vMerge/>' : (cell.rowSpan || 1) > 1 ? '<w:vMerge w:val="restart"/>' : ""}<w:vAlign w:val="center"/>${cell.header ? '<w:shd w:fill="EAF0F5"/>' : ""}</w:tcPr>${paragraph(continuation ? "" : cell.text, cell.header ? "TableHeader" : "Normal")}</w:tc>`;
    };
    const pending = new Map<number, {cell: OfficialWordCell; remaining: number}>();
    const rowXml = rows.map((row, index) => {
      let column = 0; let cells = "";
      const continuation = () => {
        while (pending.has(column)) {
          const current = pending.get(column)!; const position = column;
          cells += cellXml(current.cell, column, true); column += current.cell.colSpan || 1;
          if (--current.remaining === 0) pending.delete(position);
        }
      };
      for (const cell of row) {
        continuation(); cells += cellXml(cell, column);
        if ((cell.rowSpan || 1) > 1) pending.set(column, {cell, remaining: cell.rowSpan! - 1});
        column += cell.colSpan || 1;
      }
      continuation();
      const keepRow = row.every(cell => cell.text.length < 1500 && cell.text.split(/\r?\n/).length < 15);
      return `<w:tr><w:trPr>${keepRow ? '<w:cantSplit/>' : ""}${index < (block.headerRows || 0) ? '<w:tblHeader/>' : ""}</w:trPr>${cells}</w:tr>`;
    }).join("");
    // A real paragraph separates adjacent tables; otherwise Word merges their grids.
    return `<w:tbl><w:tblPr><w:tblW w:w="${available}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="55" w:type="dxa"/><w:left w:w="75" w:type="dxa"/><w:bottom w:w="55" w:type="dxa"/><w:right w:w="75" w:type="dxa"/></w:tblCellMar><w:tblBorders>${["top", "left", "bottom", "right", "insideH", "insideV"].map(side => `<w:${side} w:val="single" w:sz="4" w:color="64748B"/>`).join("")}</w:tblBorders></w:tblPr><w:tblGrid>${widths.map(width => `<w:gridCol w:w="${width}"/>`).join("")}</w:tblGrid>${rowXml}</w:tbl><w:p><w:pPr><w:spacing w:before="0" w:after="60" w:line="20" w:lineRule="exact"/></w:pPr></w:p>`;
  };
  let removedSourceTitle = false;
  const body = blocks.filter(block => {
    if (!removedSourceTitle && block.kind === "paragraph" && block.text === title) { removedSourceTitle = true; return false; }
    return true;
  }).map(block => block.kind === "paragraph" ? paragraph(block.text) : table(block)).join("");
  const files = {
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`,
    "word/_rels/document.xml.rels": `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    "word/document.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraph(title, "Title")}${body}<w:sectPr><w:pgSz w:w="${landscape ? 16838 : 11906}" w:h="${landscape ? 11906 : 16838}"${landscape ? ' w:orient="landscape"' : ""}/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/></w:sectPr></w:body></w:document>`,
    "word/styles.xml": wordDocumentStyles(20, true),
    "docProps/core.xml": `<?xml version="1.0" encoding="UTF-8"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${xml(title)}</dc:title><dc:description>${xml(provenance)}</dc:description></cp:coreProperties>`,
  };
  return createBinaryZip(Object.entries(files).map(([name, text]) => ({ name, bytes: new TextEncoder().encode(text) })));
}
