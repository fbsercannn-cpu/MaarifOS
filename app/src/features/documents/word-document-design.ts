import { DOCUMENT_COLORS } from "./document-theme.ts";

export const wordXmlText = (text: string): string => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const FONTS = '<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Arial" w:cs="Arial"/>';

/** Real Word styles keep the outline editable; headings stay with their content. */
export function wordDocumentStyles(bodySize = 22, compact = false): string {
  const size = (value: number) => `<w:sz w:val="${value}"/><w:szCs w:val="${value}"/>`;
  const heading = (level: number, value: number) => `<w:style w:type="paragraph" w:styleId="Heading${level}"><w:name w:val="heading ${level}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:keepLines/><w:outlineLvl w:val="${level - 1}"/><w:spacing w:before="${compact ? 160 : 260}" w:after="100"/></w:pPr><w:rPr><w:b/><w:color w:val="${DOCUMENT_COLORS.ink}"/>${size(value)}</w:rPr></w:style>`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="${NS}"><w:docDefaults><w:rPrDefault><w:rPr>${FONTS}<w:color w:val="${DOCUMENT_COLORS.ink}"/>${size(bodySize)}<w:lang w:val="tr-TR" w:eastAsia="tr-TR" w:bidi="tr-TR"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:widowControl/><w:spacing w:after="${compact ? 80 : 120}" w:line="${compact ? 240 : 276}" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/><w:pPr><w:widowControl/></w:pPr><w:rPr>${FONTS}${size(bodySize)}</w:rPr></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:after="240"/></w:pPr><w:rPr><w:b/><w:color w:val="000000"/>${size(compact ? 30 : 38)}</w:rPr></w:style>${heading(1, compact ? 22 : 30)}${heading(2, compact ? 20 : 25)}<w:style w:type="paragraph" w:styleId="TableHeader"><w:name w:val="Table Header"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:shd w:fill="${DOCUMENT_COLORS.tealTint}"/></w:pPr><w:rPr><w:b/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="FormBody"><w:name w:val="Form Body"/><w:basedOn w:val="Normal"/></w:style></w:styles>`;
}

export function wordPageField(name: "PAGE" | "NUMPAGES"): string {
  return `<w:r><w:fldChar w:fldCharType="begin" w:dirty="true"/></w:r><w:r><w:instrText xml:space="preserve"> ${name} </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:rPr>${FONTS}<w:sz w:val="16"/></w:rPr><w:t>1</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>`;
}

export function wordRunningHeader(title: string, context?: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr xmlns:w="${NS}"><w:p><w:pPr><w:spacing w:after="60"/></w:pPr><w:r><w:rPr>${FONTS}<w:b/><w:color w:val="${DOCUMENT_COLORS.ink}"/><w:sz w:val="16"/></w:rPr><w:t>${wordXmlText(title)}</w:t></w:r></w:p>${context ? `<w:p><w:pPr><w:spacing w:after="60"/></w:pPr><w:r><w:rPr>${FONTS}<w:color w:val="${DOCUMENT_COLORS.ink}"/><w:sz w:val="14"/></w:rPr><w:t>${wordXmlText(context)}</w:t></w:r></w:p>` : ""}</w:hdr>`;
}

export function wordRunningFooter(context: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr xmlns:w="${NS}"><w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="60"/></w:pPr><w:r><w:rPr>${FONTS}<w:color w:val="${DOCUMENT_COLORS.ink}"/><w:sz w:val="16"/></w:rPr><w:t xml:space="preserve">${wordXmlText(context)} · Sayfa </w:t></w:r>${wordPageField("PAGE")}<w:r><w:t xml:space="preserve"> / </w:t></w:r>${wordPageField("NUMPAGES")}</w:p></w:ftr>`;
}
