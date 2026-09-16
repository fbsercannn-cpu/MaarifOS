import { createBinaryZip } from "../documents/binary-zip.ts";
import { wordDocumentStyles, wordRunningFooter, wordXmlText } from "../documents/word-document-design.ts";
import type { SemanticPdfNode } from "../documents/semantic-tagged-pdf.ts";
export function createStudentSummaryWord(nodes: readonly SemanticPdfNode[]): Uint8Array {
  const namespace = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const paragraphs = nodes.flatMap(node => {
    if (node.kind !== "heading" && node.kind !== "paragraph") return [];
    const style = node.kind === "heading" ? node.level === 1 ? "Title" : "Heading2" : "Normal";
    const runs = node.text.split("\n").map((line, i) => `${i ? "<w:r><w:br/></w:r>" : ""}<w:r><w:t xml:space="preserve">${wordXmlText(line)}</w:t></w:r>`).join("");
    return [`<w:p><w:pPr><w:pStyle w:val="${style}"/></w:pPr>${runs}</w:p>`];
  }).join("");
  const files = [
    { name: "[Content_Types].xml", text: '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>' },
    { name: "_rels/.rels", text: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>' },
    { name: "word/_rels/document.xml.rels", text: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="styles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="footer" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>' },
    { name: "word/document.xml", text: `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="${namespace}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${paragraphs}<w:sectPr><w:footerReference w:type="default" r:id="footer"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="640" w:right="640" w:bottom="800" w:left="640" w:header="320" w:footer="360"/></w:sectPr></w:body></w:document>` },
    { name: "word/styles.xml", text: wordDocumentStyles(20, true) },
    { name: "word/footer1.xml", text: wordRunningFooter("MaarifOS · Öğrenci özeti") },
  ];
  return createBinaryZip(files.map(file => ({ name: file.name, bytes: new TextEncoder().encode(file.text) })));
}
