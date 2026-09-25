import type { BrowserFileDownload } from "../documents/browser-file-download.ts";
import { createBinaryZip } from "../documents/binary-zip.ts";
import { wordDocumentStyles, wordRunningFooter, wordRunningHeader, wordXmlText } from "../documents/word-document-design.ts";
import type { PlanningCalendarDay, WeeklyDeskPlanModel } from "./calendar-print-model.ts";

export const WEEKLY_DESK_PLAN_WORD_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document" as const;
const NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

function unique(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${value}T12:00:00.000Z`));
}

function activityLines(day: PlanningCalendarDay): string[] {
  const activities = day.items.filter((item) => item.kind === "activity" || item.kind === "daily-plan").map((item) => item.title);
  const calendar = day.items.filter((item) => item.kind === "calendar-entry").map((item) => `Takvim · ${item.title}`);
  return [...activities, ...calendar].length ? [...activities, ...calendar] : [day.isTeachingDay ? "Kayıtlı etkinlik yok" : "Öğretim günü değil"];
}

function rowValues(model: WeeklyDeskPlanModel): { label: string; days: string[][] }[] {
  const rows: { label: string; days: string[][] }[] = [];
  if (model.fields.includes("activities") || model.fields.includes("calendar-entries")) {
    rows.push({ label: "Etkinlikler", days: model.days.map(activityLines) });
  }
  if (model.fields.includes("observation-focus")) {
    rows.push({ label: "Gözlem odağı", days: model.days.map((day) => unique(day.items.flatMap((item) => item.observationFocus)).length ? unique(day.items.flatMap((item) => item.observationFocus)) : ["Kayıtlı gözlem odağı yok"]) });
  }
  if (model.fields.includes("materials")) {
    rows.push({ label: "Materyaller", days: model.days.map((day) => unique(day.items.flatMap((item) => item.materials)).length ? unique(day.items.flatMap((item) => item.materials)) : ["Kayıtlı materyal yok"]) });
  }
  return rows;
}

function run(text: string, bold = false): string {
  return `<w:r><w:rPr>${bold ? "<w:b/>" : ""}<w:lang w:val="tr-TR"/></w:rPr><w:t xml:space="preserve">${wordXmlText(text)}</w:t></w:r>`;
}

function paragraph(text: string, bold = false): string {
  return `<w:p><w:pPr><w:spacing w:after="40" w:line="210" w:lineRule="auto"/></w:pPr>${run(text, bold)}</w:p>`;
}

function cell(lines: readonly string[], heading?: string): string {
  const content = `${heading ? paragraph(heading, true) : ""}${lines.map((line) => paragraph(line)).join("")}`;
  return `<w:tc><w:tcPr><w:tcW w:w="3150" w:type="dxa"/><w:vAlign w:val="top"/><w:tcMar><w:top w:w="70" w:type="dxa"/><w:left w:w="70" w:type="dxa"/><w:bottom w:w="70" w:type="dxa"/><w:right w:w="70" w:type="dxa"/></w:tcMar></w:tcPr>${content}</w:tc>`;
}

function table(model: WeeklyDeskPlanModel): string {
  const header = `<w:tr><w:trPr><w:tblHeader/><w:cantSplit/></w:trPr>${model.days.map((day) => cell([], `${day.label} · ${dateLabel(day.civilDate)}`)).join("")}</w:tr>`;
  const body = rowValues(model).map((row) => `<w:tr><w:trPr><w:cantSplit/></w:trPr>${row.days.map((lines) => cell(lines, row.label)).join("")}</w:tr>`).join("");
  return `<w:tbl><w:tblPr><w:tblW w:w="15750" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders><w:top w:val="single" w:sz="8" w:color="607D91"/><w:left w:val="single" w:sz="8" w:color="607D91"/><w:bottom w:val="single" w:sz="8" w:color="607D91"/><w:right w:val="single" w:sz="8" w:color="607D91"/><w:insideH w:val="single" w:sz="6" w:color="607D91"/><w:insideV w:val="single" w:sz="6" w:color="607D91"/></w:tblBorders></w:tblPr><w:tblGrid>${model.days.map(() => '<w:gridCol w:w="3150"/>').join("")}</w:tblGrid>${header}${body}</w:tbl>`;
}

/** Editable five-column landscape table built only from the already-filtered read model. */
export function createWeeklyDeskPlanWord(model: WeeklyDeskPlanModel): BrowserFileDownload {
  const period = `${model.days[0]?.civilDate ?? model.periodStart} – ${model.days.at(-1)?.civilDate ?? model.periodEnd}`;
  const body = [
    '<w:p><w:pPr><w:pStyle w:val="Title"/><w:keepNext/></w:pPr>' + run("HAFTALIK MASA PLANI", true) + "</w:p>",
    paragraph(`Okul: ${model.schoolName} · Sınıf: ${model.classroomName}`),
    paragraph(`Eğitim yılı: ${model.academicYearName} · Öğretmen: ${model.teacherName}`),
    paragraph(`Dönem: ${period}`),
    table(model),
  ].join("");
  const files = [
    { name: "[Content_Types].xml", text: '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>' },
    { name: "_rels/.rels", text: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>' },
    { name: "word/_rels/document.xml.rels", text: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="styles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="header" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/><Relationship Id="footer" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>' },
    { name: "word/document.xml", text: `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="${NS}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${body}<w:sectPr><w:headerReference w:type="default" r:id="header"/><w:footerReference w:type="default" r:id="footer"/><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/><w:pgMar w:top="560" w:right="540" w:bottom="680" w:left="540" w:header="280" w:footer="320"/></w:sectPr></w:body></w:document>` },
    { name: "word/styles.xml", text: wordDocumentStyles(18, true) },
    { name: "word/header1.xml", text: wordRunningHeader("MaarifOS · Haftalık Masa Planı", `${model.classroomName} · ${period}`) },
    { name: "word/footer1.xml", text: wordRunningFooter("MaarifOS · Kayıtlı öğretmen planı") },
  ];
  return {
    bytes: createBinaryZip(files.map((file) => ({ name: file.name, bytes: new TextEncoder().encode(file.text) }))),
    mimeType: WEEKLY_DESK_PLAN_WORD_MIME,
    fileName: `MaarifOS_Haftalik_Masa_Plani_${model.days[0]?.civilDate ?? model.periodStart}.docx`,
  };
}
