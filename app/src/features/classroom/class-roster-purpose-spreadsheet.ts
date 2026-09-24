import type { ClassRosterExportModel } from "./class-roster-document.ts";
import { resolveClassRosterLayout, type ClassRosterLayoutId } from "./class-roster-layouts.ts";

type Xlsx = typeof import("xlsx");
export const PURPOSE_SHEET_NAME = "Kullanım baskısı";

/** The technical key travels with each source row when the filtered table is sorted. */
export function appendPurposeSpreadsheet(xlsx: Xlsx, workbook: import("xlsx").WorkBook, model: ClassRosterExportModel, layout: ClassRosterLayoutId) {
  const source = workbook.Sheets[workbook.SheetNames[0]!]!;
  const keyColumn = xlsx.utils.encode_col(model.columns.length);
  const counts = new Map<string, number>();
  const keys = model.rowStudentIds.map((id) => {
    const ordinal = (counts.get(id) ?? 0) + 1;
    counts.set(id, ordinal);
    return `${id}:${ordinal}`;
  });
  source[`${keyColumn}7`] = { t: "s", v: "Kayıt anahtarı" };
  keys.forEach((key, index) => { source[`${keyColumn}${index + 8}`] = { t: "s", v: key }; });
  source["!cols"]!.push({ hidden: true, wch: 4 });
  source["!ref"] = `A1:${keyColumn}${Math.max(7, model.rows.length + 7)}`;
  source["!autofilter"] = { ref: `A7:${keyColumn}${Math.max(7, model.rows.length + 7)}` };
  const keyRange = `'Sınıf listesi'!$${keyColumn}$8:$${keyColumn}$${Math.max(8, model.rows.length + 7)}`;
  const sheet: import("xlsx").WorkSheet = {};
  const heights: number[] = [];
  const styles = new Map<string, number>();
  const merges: import("xlsx").Range[] = [];
  const breaks: number[] = [];
  const singlePage = layout === "single-page-roster";
  const landscape = layout === "contact-blocks" || singlePage;
  const widths = singlePage
    ? [4, 22, 13, 18, 13, 15, 18, 13, 15, 18, 11, 15]
    : landscape ? [46, 46, 46] : layout === "daily-classroom" ? [6, 14, 42, 20] : [24, 36, 22];
  const last = xlsx.utils.encode_col(widths.length - 1);
  let row = 0;
  let pageHeight = 0;
  const addRow = (height: number) => { heights.push(height); row += 1; pageHeight += height; return row; };
  const put = (r: number, c: number, value: string, style = 14) => {
    const address = xlsx.utils.encode_cell({ r: r - 1, c });
    sheet[address] = { t: "s", v: value }; styles.set(address, style);
  };
  const merged = (r: number, start: number, end: number) => { for (let c = start + 1; c <= end; c++) put(r, c, "", styles.get(xlsx.utils.encode_cell({ r: r - 1, c: start })) ?? 14); if (end > start) merges.push({ s: { r: r - 1, c: start }, e: { r: r - 1, c: end } }); };
  const title = layout === "daily-classroom" ? "SINIFTA KULLANIM LİSTESİ" : layout === "contact-blocks" ? "ÖĞRENCİ İLETİŞİM KARTLARI" : singlePage ? "SINIF ÖĞRENCİ VE VELİ LİSTESİ" : "AYRINTILI ÖĞRENCİ DÖKÜMÜ";
  const masthead = singlePage
    ? [title, model.metadata.schoolName, `${model.metadata.classroomName} · ${model.metadata.academicYearLabel} · ${model.metadata.studentCount} öğrenci`]
    : [title, model.metadata.schoolName, `${model.metadata.classroomName} · ${model.metadata.academicYearLabel}`, `${model.metadata.teacherName} · ${model.metadata.studentCount} öğrenci · ${model.metadata.generatedCivilDate}`];
  masthead.forEach((text, i) => { const r = addRow(singlePage ? (i === 0 ? 24 : 18) : (i === 0 ? 32 : 25)); put(r, 0, text, i === 0 ? 1 : 3); merged(r, 0, widths.length - 1); });
  const headerHeight = pageHeight;
  const pageLimit = landscape ? 525 : 760;
  const startBlock = (height: number) => { if (pageHeight + height > pageLimit && row > 4) { breaks.push(row); pageHeight = headerHeight; return true; } return false; };
  const link = (r: number, c: number, sourceRow: number, column: number) => {
    const key = `"${keys[sourceRow]}"`;
    const col = xlsx.utils.encode_col(column);
    const range = `'Sınıf listesi'!$${col}$8:$${col}$${Math.max(8, model.rows.length + 7)}`;
    const lookup = `INDEX(${range},MATCH(${key},${keyRange},0))`;
    const address = xlsx.utils.encode_cell({ r: r - 1, c });
    const original = source[`${col}${sourceRow + 8}`]!;
    sheet[address] = { t: original.t, v: original.v, ...(original.z ? { z: original.z } : {}), f: `IF(COUNTIF(${keyRange},${key})<>1,NA(),IF(${lookup}="","",${lookup}))` };
    styles.set(address, model.columns[column]!.id === "birthDate" && original.t === "n" ? 26 : 14);
  };
  const students = [...new Set(model.rowStudentIds)];
  if (singlePage) {
    if (students.length > 30) throw new Error("Tek sayfa sınıf listesi en fazla 30 öğrenciyle hazırlanabilir.");
    const definition = resolveClassRosterLayout(layout);
    if (model.columns.some((column) => !definition.defaultColumns.includes(column.id))) {
      throw new Error("Tek sayfa sınıf listesi yalnız tanımlı 12 öğrenci ve veli alanının alt seçimiyle hazırlanabilir.");
    }
    const exactColumns = definition.defaultColumns.map((id) => {
      const index = model.columns.findIndex((column) => column.id === id);
      return { id, index };
    });
    const groupRow = addRow(18);
    [["Öğrenci", 0], ["Anne", 3], ["Baba", 6], ["Üçüncü kişi", 9]].forEach(([label, start]) => {
      put(groupRow, Number(start), String(label), 4);
      merged(groupRow, Number(start), Number(start) + 2);
    });
    const headerRow = addRow(28);
    ["Sıra", "Öğrenci adı soyadı", "T.C. kimlik no.", "Adı soyadı", "Mesleği", "Telefonu", "Adı soyadı", "Mesleği", "Telefonu", "Adı soyadı", "Yakınlığı", "Telefonu"]
      .forEach((label, column) => put(headerRow, column, label, 4));
    const aggregateLinks = (r: number, c: number, sourceRows: readonly number[], column: number, style: number) => {
      const populated = sourceRows.filter((sourceRow) => Boolean(model.rows[sourceRow]?.[column]));
      if (!populated.length) { put(r, c, "—"); return; }
      const col = xlsx.utils.encode_col(column);
      const range = `'Sınıf listesi'!$${col}$8:$${col}$${Math.max(8, model.rows.length + 7)}`;
      const lookups = populated.map((sourceRow) => {
        const key = `"${keys[sourceRow]}"`;
        return { key, value: model.rows[sourceRow]![column]!, formula: `INDEX(${range},MATCH(${key},${keyRange},0))` };
      });
      const address = xlsx.utils.encode_cell({ r: r - 1, c });
      const joined = lookups.map((entry, index) => `${index ? '" · "&' : ""}${entry.formula}`).join("&");
      const valid = lookups.map((entry) => `COUNTIF(${keyRange},${entry.key})=1`).join(",");
      sheet[address] = { t: "s", v: lookups.map((entry) => entry.value).join(" · "), f: `IF(AND(${valid}),${joined},NA())` };
      styles.set(address, style);
    };
    const compactStudentRows = students.length > 20;
    for (const id of students) {
      const indexes = model.rowStudentIds.flatMap((value, index) => value === id ? [index] : []);
      const estimatedLines = exactColumns.reduce((maximum, { id: columnId, index }, column) => {
        if (index < 0) return maximum;
        const sourceRows = /^(?:mother|father|other)/u.test(columnId) ? indexes : indexes.slice(0, 1);
        const text = sourceRows.map((sourceRow) => model.rows[sourceRow]?.[index] ?? "").filter(Boolean).join(" · ");
        return Math.max(maximum, Math.ceil(Array.from(text).length / Math.max(4, Math.floor(widths[column]! * .84))));
      }, 1);
      const rowStyle = compactStudentRows ? 32 : 14;
      const r = addRow(compactStudentRows ? 18 : Math.min(70, Math.max(24, estimatedLines * 13 + 4)));
      exactColumns.forEach(({ id: columnId, index }, column) => {
        if (index < 0) put(r, column, "—", rowStyle);
        else aggregateLinks(r, column, /^(?:mother|father|other)/u.test(columnId) ? indexes : indexes.slice(0, 1), index, rowStyle);
      });
    }
    const teacherHeader = addRow(17); put(teacherHeader, 0, "Okul Öncesi Öğretmeni", 16); merged(teacherHeader, 0, widths.length - 1);
    const teacherRow = addRow(18); put(teacherRow, 0, model.metadata.teacherName, 14); merged(teacherRow, 0, widths.length - 1);
    sheet["!ref"] = `A1:${last}${row}`;
    sheet["!cols"] = widths.map((wch) => ({ wch })); sheet["!rows"] = heights.map((hpt) => ({ hpt })); sheet["!merges"] = merges;
    sheet["!autofilter"] = { ref: `A${headerRow}:${last}${headerRow + students.length}` };
    sheet["!margins"] = { left: .2, right: .2, top: .25, bottom: .25, header: .1, footer: .1 };
    xlsx.utils.book_append_sheet(workbook, sheet, PURPOSE_SHEET_NAME);
    return { last, lastRow: row, styles, breaks, orientation: "landscape" as const, repeatRows: headerRow, fitToHeight: 1 };
  }
  if (layout === "daily-classroom") {
    const r = addRow(26); ["Sıra", "Okul no", "Adı soyadı", "İşaret / not"].forEach((v, c) => put(r, c, v, 4));
    for (const id of students) {
      const index = model.rowStudentIds.indexOf(id);
      const nameIndex = model.columns.findIndex((c) => c.id === "name");
      const height = Math.max(32, Math.ceil((model.rows[index]?.[nameIndex]?.length ?? 0) / 33) * 14 + 10);
      startBlock(height); const r = addRow(height);
      ["sequence", "schoolNumber", "name"].forEach((id, c) => { const col = model.columns.findIndex((v) => v.id === id); if (col >= 0) link(r, c, index, col); else put(r, c, ""); });
      put(r, 3, "");
    }
  }
  const selected = model.columns.map((column, index) => ({ column, index })).filter(({ column }) => layout !== "daily-classroom" || !["sequence", "schoolNumber", "name"].includes(column.id));
  if (landscape) {
    const aggregate = (r: number, c: number, sourceRow: number, columns: typeof selected, separator: string) => {
      const parts = columns.map(({ column, index }) => {
        link(r, c, sourceRow, index);
        const cell = sheet[xlsx.utils.encode_cell({ r: r - 1, c })]!;
        const label = `${column.label}: `;
        const formula = column.id === "birthDate" && cell.t === "n" ? `TEXT(${cell.f},"dd.mm.yyyy")` : cell.f!;
        return { text: label + (model.rows[sourceRow]?.[index] ?? ""), formula: `"${label.replace(/"/gu, '\"\"')}"&${formula}` };
      });
      const address = xlsx.utils.encode_cell({ r: r - 1, c });
      sheet[address] = { t: "s", v: parts.map((part) => part.text).join(separator), ...(parts.length ? { f: parts.map((part) => part.formula).join(separator === "\n" ? '&CHAR(10)&' : '&" · "&') } : {}) };
      styles.set(address, 14);
    };
    for (const id of students) {
      const indexes = model.rowStudentIds.flatMap((value, index) => value === id ? [index] : []);
      const identity = selected.filter(({ column }) => !/^(mother|father|other)/u.test(column.id));
      const zones = ["mother", "father", "other"].map((prefix) => selected.filter(({ column }) => column.id.startsWith(prefix)));
      const identityText = identity.map(({ column, index }) => `${column.label}: ${model.rows[indexes[0]!]![index]}`).join(" · ");
      const identityHeight = Math.max(32, Math.ceil(identityText.length / 123) * 14 + 12);
      const zoneHeight = (sourceRow: number, ordinal: number) => Math.max(28, ...zones.map((columns, zone) => ordinal > 0 && zone < 2 ? 0 : columns.reduce((lines, { column, index }) => lines + Math.max(1, Math.ceil((column.label.length + 2 + (model.rows[sourceRow]?.[index]?.length ?? 0)) / 41)), 0) * 14 + 12));
      const total = identityHeight + indexes.reduce((sum, sourceRow, ordinal) => sum + zoneHeight(sourceRow, ordinal), 0) + 8;
      startBlock(total);
      const heading = () => { const r = addRow(identityHeight); aggregate(r, 0, indexes[0]!, identity, " · "); styles.set(`A${r}`, 16); merged(r, 0, 2); };
      heading();
      indexes.forEach((sourceRow, ordinal) => {
        const height = zoneHeight(sourceRow, ordinal);
        if (startBlock(height)) heading();
        const r = addRow(height);
        zones.forEach((columns, c) => aggregate(r, c, sourceRow, ordinal > 0 && c < 2 ? [] : columns, "\n"));
      });
      addRow(8);
    }
  }
  if (!landscape && selected.length) for (const id of students) {
    const indexes = model.rowStudentIds.flatMap((value, index) => value === id ? [index] : []);
    const fields = indexes.flatMap((sourceRow, ordinal) => selected.filter(({ column }) => ordinal === 0 || column.id.startsWith("other")).map((entry) => ({ ...entry, sourceRow })));
    const lines = [];
    for (let i = 0; i < fields.length; i += landscape ? 2 : 1) lines.push(fields.slice(i, i + (landscape ? 2 : 1)));
    const lineHeights = lines.map((line) => Math.max(26, ...line.map(({ sourceRow, index, column }) => Math.max(Math.ceil((model.rows[sourceRow]?.[index]?.length ?? 0) / (landscape ? 43 : 51)), Math.ceil(column.label.length / (landscape ? 21 : 22))) * 14 + 10)));
    const nameCol = model.columns.findIndex((c) => c.id === "name");
    const studentHeadingHeight = Math.max(28, Math.ceil((model.rows[indexes[0]!]![nameCol]?.length ?? 0) / (landscape ? 115 : 66)) * 14 + 12);
    startBlock(studentHeadingHeight + lineHeights.reduce((a, b) => a + b, 0));
    const r = addRow(studentHeadingHeight);
    if (nameCol >= 0) link(r, 0, indexes[0]!, nameCol); else put(r, 0, `Öğrenci ${students.indexOf(id) + 1}`);
    styles.set(`A${r}`, 4); merged(r, 0, widths.length - 1);
    lines.forEach((line, i) => { if (startBlock(lineHeights.slice(i).reduce((sum, height) => sum + height, 0) <= 115 ? lineHeights.slice(i).reduce((sum, height) => sum + height, 0) : lineHeights[i]!)) { const continued = addRow(studentHeadingHeight); if (nameCol >= 0) link(continued, 0, indexes[0]!, nameCol); else put(continued, 0, `Öğrenci ${students.indexOf(id) + 1} · devam`); styles.set(`A${continued}`, 4); merged(continued, 0, widths.length - 1); } const r = addRow(lineHeights[i]!); line.forEach(({ column, index, sourceRow }, j) => { put(r, j * 2, column.label, 16); link(r, j * 2 + 1, sourceRow, index); if (!landscape) merged(r, 1, widths.length - 1); }); });
    addRow(9);
  }
  sheet["!ref"] = `A1:${last}${row}`;
  sheet["!cols"] = widths.map((wch) => ({ wch })); sheet["!rows"] = heights.map((hpt) => ({ hpt })); sheet["!merges"] = merges;
  sheet["!margins"] = { left: .3, right: .3, top: .4, bottom: .4, header: .15, footer: .2 };
  xlsx.utils.book_append_sheet(workbook, sheet, PURPOSE_SHEET_NAME);
  return { last, lastRow: row, styles, breaks, orientation: landscape ? "landscape" : "portrait", repeatRows: layout === "daily-classroom" ? 5 : 4, fitToHeight: 0 };
}

export function purposeSheetXml(xml: string, print: ReturnType<typeof appendPurposeSpreadsheet>) {
  let output = xml.replace(/<c\b([^>]*)>/gu, (tag, attrs: string) => { const address = attrs.match(/\br="([A-Z]+[0-9]+)"/u)?.[1]; return address ? `<c${attrs.replace(/\s+s="\d+"/gu, "")} s="${print.styles.get(address) ?? 14}">` : tag; });
  output = output.replace(/<sheetViews>.*?<\/sheetViews>/u, `<sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="${print.repeatRows}" topLeftCell="A${print.repeatRows + 1}" state="frozen" activePane="bottomLeft"/></sheetView></sheetViews>`);
  output = output.replace(/(<worksheet\b[^>]*>)/u, '$1<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>');
  output = output.replace(/(<pageMargins\b[^>]*\/>)/u, `$1<pageSetup paperSize="9" orientation="${print.orientation}" fitToWidth="1" fitToHeight="${print.fitToHeight}"/><headerFooter><oddFooter>&amp;LMaarifOS&amp;R&amp;P / &amp;N</oddFooter></headerFooter>${print.breaks.length ? `<rowBreaks count="${print.breaks.length}" manualBreakCount="${print.breaks.length}">${print.breaks.map((id) => `<brk id="${id}" min="0" max="16383" man="1"/>`).join("")}</rowBreaks>` : ""}`);
  return output;
}
