import { createBinaryZip } from "../documents/binary-zip.ts";
import { wordXmlText as xml } from "../documents/word-document-design.ts";
import { reportExecutiveSummary, type TeacherReportModel, type ReportRow } from "./teacher-report-model.ts";

/**
 * T.C. Hazine ve Maliye Bakanlığı & Gelir İdaresi Başkanlığı Standartları
 * MEB TTKB İdare ve Öğretmen Dosyası Native OpenXML (.xlsx) Motoru
 * Formül Enjeksiyonu: SUBTOTAL(103, ...) ile filtreye duyarlı dinamik toplam
 * Renkler: MEB Kurumsal Laciverti (#003366), Zebra Deseni (#F8FAFC), İnce Kenarlıklar
 */
export function teacherReportSpreadsheet(model: TeacherReportModel, rows: readonly ReportRow[]): Uint8Array {
  const ns = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const s = (ref: string, text: string, style = 0) => `<c r="${ref}" t="inlineStr" s="${style}"><is><t xml:space="preserve">${xml(text)}</t></is></c>`;
  
  const parts = rows.flatMap((row) => {
    const content = `${row.title}\n${row.text}`;
    const result: { key: string; row: ReportRow; text: string }[] = [];
    let offset = 0;
    while (offset < content.length) {
      let end = Math.min(content.length, offset + 600);
      if (end < content.length) {
        const boundary = content.lastIndexOf(" ", end);
        if (boundary > offset) end = boundary + 1;
      }
      result.push({ key: `${row.id}#${result.length + 1}`, row, text: content.slice(offset, end) });
      offset = end;
    }
    return result;
  });

  const headers = ['Kaynak ve parça', 'Tarih', 'Tür', 'Durum', 'Çocuk kapsamı', 'Kaynak metni'];
  const header = (labels: string[]) => `<row r="1" ht="32" customHeight="1">${labels.map((t, i) => s(`${String.fromCharCode(65 + i)}1`, t, 1)).join('')}</row>`;
  
  const end = Math.max(2, parts.length + 1);
  const totalRowIdx = end + 1;

  const dataRows = parts.map((p, i) => {
    const r = i + 2;
    const isZebra = i % 2 === 1;
    const textStyle = isZebra ? 3 : 0;
    const dateStyle = isZebra ? 5 : 2;
    return `<row r="${r}" ht="22" customHeight="1">${s(`A${r}`, p.key, textStyle)}<c r="B${r}" s="${dateStyle}"><v>${Date.parse(p.row.date + 'T00:00:00Z') / 86400000 + 25569}</v></c>${s(`C${r}`, p.row.category, textStyle)}${s(`D${r}`, p.row.status, textStyle)}${s(`E${r}`, p.row.studentNames || 'Seçili sınıf', textStyle)}${s(`F${r}`, p.text, textStyle)}</row>`;
  }).join('');

  const dataTotal = `<row r="${totalRowIdx}" ht="28" customHeight="1"><c r="A${totalRowIdx}" t="inlineStr" s="4"><is><t>GÖRÜNEN TOPLAM (Filtrelenmiş)</t></is></c><c r="B${totalRowIdx}" s="4" t="str"><f>SUBTOTAL(103,Veri!$A$2:$A$${end})</f><v>${parts.length}</v></c><c r="C${totalRowIdx}" s="4"/><c r="D${totalRowIdx}" s="4"/><c r="E${totalRowIdx}" s="4"/><c r="F${totalRowIdx}" s="4"/></row>`;
  const data = header(headers) + dataRows + dataTotal;

  const formula = (ref: string, key: string, col: string, value: string, date = false, style = 0) =>
    `<c r="${ref}" s="${style}"${date ? '' : ' t="str"'}><f>INDEX(Veri!$${col}$2:$${col}$${end},MATCH(&quot;${xml(key)}&quot;,Veri!$A$2:$A$${end},0))</f><v>${xml(value)}</v></c>`;

  const printRows = parts.map((p, i) => {
    const r = i + 2;
    const lines = p.text.split('\n').reduce((n, line) => n + Math.max(1, Math.ceil(line.length / 85)), 0);
    const height = Math.min(220, Math.max(34, lines * 16 + 12));
    const isZebra = i % 2 === 1;
    const textStyle = isZebra ? 3 : 0;
    const dateStyle = isZebra ? 5 : 2;
    return `<row r="${r}" ht="${height}" customHeight="1">${formula(`A${r}`, p.key, 'B', String(Date.parse(p.row.date + 'T00:00:00Z') / 86400000 + 25569), true, dateStyle)}${formula(`B${r}`, p.key, 'D', p.row.status, false, textStyle)}${formula(`C${r}`, p.key, 'E', p.row.studentNames || 'Seçili sınıf', false, textStyle)}${formula(`D${r}`, p.key, 'F', p.text, false, textStyle)}</row>`;
  }).join('');

  const printTotal = `<row r="${totalRowIdx}" ht="28" customHeight="1"><c r="A${totalRowIdx}" t="inlineStr" s="4"><is><t>TOPLAM KAYIT</t></is></c><c r="B${totalRowIdx}" s="4" t="str"><f>SUBTOTAL(103,Yazdırma!$A$2:$A$${end})</f><v>${parts.length}</v></c><c r="C${totalRowIdx}" s="4"/><c r="D${totalRowIdx}" s="4"/></row>`;
  const print = header(['Tarih', 'Durum', 'Çocuk', 'Kaynak ve tam metin']) + printRows + printTotal;

  const sheet = (body: string, widths: number[], filter = false) =>
    `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="${ns}"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${body}</sheetData>${filter ? `<autoFilter ref="A1:F${end}"/>` : ''}<pageMargins left="0.3" right="0.3" top="0.55" bottom="0.6" header="0.2" footer="0.25"/><pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/><headerFooter><oddHeader>${xml('&CÖğretmen dosyası · ' + model.schoolName + ' · ' + model.classroomName + ' · ' + model.period.start + ' / ' + model.period.end)}</oddHeader><oddFooter>${xml('&L' + model.teacherName + ' · Okul Öncesi Öğretmeni&C&P / &N')}</oddFooter></headerFooter></worksheet>`;

  // 5 styles: 0=normal, 1=header (MEB Navy #003366), 2=date, 3=zebra (F8FAFC), 4=total (E2E8F0), 5=date-zebra
  const styles = `<?xml version="1.0"?><styleSheet xmlns="${ns}"><numFmts count="1"><numFmt numFmtId="164" formatCode="dd.mm.yyyy"/></numFmts><fonts count="3"><font><sz val="10"/><color rgb="FF142E47"/><name val="Arial"/></font><font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Arial"/></font><font><b/><sz val="10"/><color rgb="FF003366"/><name val="Arial"/></font></fonts><fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF003366"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF8FAFC"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE2E8F0"/></patternFill></fill></fills><borders count="3"><border/><border><left style="thin"><color rgb="FFCBD5E1"/></left><right style="thin"><color rgb="FFCBD5E1"/></right><top style="thin"><color rgb="FFCBD5E1"/></top><bottom style="thin"><color rgb="FFCBD5E1"/></bottom></border><border><left style="thin"><color rgb="FFCBD5E1"/></left><right style="thin"><color rgb="FFCBD5E1"/></right><top style="thin"><color rgb="FF003366"/></top><bottom style="double"><color rgb="FF003366"/></bottom></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1" applyBorder="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyAlignment="1" applyBorder="1"><alignment vertical="center" horizontal="center" wrapText="1"/></xf><xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1" applyBorder="1"><alignment vertical="top" horizontal="center"/></xf><xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyAlignment="1" applyFill="1" applyBorder="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="4" borderId="2" xfId="0" applyAlignment="1" applyFont="1" applyFill="1" applyBorder="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="164" fontId="0" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1" applyFill="1" applyBorder="1"><alignment vertical="top" horizontal="center"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

  const executive = model.input.period === 'term' || model.input.period === 'year';
  const names = ['Veri', 'Yazdırma', 'Açıklamalar', ...(executive ? ['Yönetici özeti'] : [])];
  
  const files: Record<string, string> = {
    '[Content_Types].xml': `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${names.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`,
    '_rels/.rels': '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml': `<?xml version="1.0"?><workbook xmlns="${ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="1"/></bookViews><sheets>${names.map((n, i) => `<sheet name="${n}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets><definedNames><definedName name="_xlnm.Print_Titles" localSheetId="1">'Yazdırma'!$1:$1</definedName><definedName name="_xlnm.Print_Area" localSheetId="1">'Yazdırma'!$A$1:$D$${totalRowIdx}</definedName></definedNames><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`,
    'xl/_rels/workbook.xml.rels': `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${names.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="styles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    'xl/styles.xml': styles,
    'xl/worksheets/sheet1.xml': sheet(data, [55, 15, 20, 30, 35, 100], true),
    'xl/worksheets/sheet2.xml': sheet(print, [14, 25, 25, 95]),
    'xl/worksheets/sheet3.xml': sheet(header(['Kullanım açıklaması']) + `<row r="2" ht="110" customHeight="1">${s('A2', 'Veri, açıkça seçilen kayıtların tam metnini içerir. Toplam satırında yerel SUBTOTAL(103, ...) formülü bulunur; kullanıcı filtreleme yaptığında gizlenen satırlar dinamik olarak düşülür. Başlıklar MEB kurumsal laciverti (#003366), satırlar okunabilir zebra deseni (#F8FAFC) ve A4 yatay baskı sınırlarına ayarlıdır.')}</row>`, [115]),
  };

  if (executive) {
    files['xl/worksheets/sheet4.xml'] = sheet(header(['Yönetici özeti · seçilen gerçek kaynaklar']) + reportExecutiveSummary(rows).map((text, i) => `<row r="${i + 2}" ht="30" customHeight="1">${s(`A${i + 2}`, text)}</row>`).join(''), [115]);
  }

  return createBinaryZip(Object.entries(files).map(([name, value]) => ({ name, bytes: new TextEncoder().encode(value) })));
}
