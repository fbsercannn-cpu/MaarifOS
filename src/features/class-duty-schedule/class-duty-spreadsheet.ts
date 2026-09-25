import {isCivilDate} from '../../core/domain/attendance.ts';
import type {ClassDutyRow} from '../../core/domain/class-duty-schedule.ts';
import {wordXmlText} from '../documents/word-document-design.ts';
import type {DutyChange} from './class-duty-model.ts';
import {dutyStatusLabel,dutyRevisionSource,type DutyDocumentModel} from './class-duty-document-model.ts';

const FORMAT='MAARIFOS_CLASS_DUTY_V1', DATA='Veri', META='Kaynak', PEOPLE='Çocuklar';
export const DUTY_XLSX_MIME='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const serial=(date:string)=>(Date.parse(`${date}T00:00:00Z`)-Date.UTC(1899,11,30))/86400000;
const styles=`<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="dd.mm.yyyy"/></numFmts><fonts count="3"><font><sz val="11"/><color rgb="FF17324D"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="18"/><color rgb="FF17324D"/><name val="Calibri"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF17324D"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE9F8F5"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border/><border><left style="thin"><color rgb="FF607D91"/></left><right style="thin"><color rgb="FF607D91"/></right><top style="thin"><color rgb="FF607D91"/></top><bottom style="thin"><color rgb="FF607D91"/></bottom></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0"><alignment vertical="center" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

export async function createClassDutySpreadsheet(model:DutyDocumentModel){
 const x=await import('xlsx'),book=x.utils.book_new(),w=model.record.workflow;
 const rows:unknown[][]=[[model.title],[`${model.schoolName} · ${model.classroomName}`],[`${model.teacherName} · ${model.academicYearName}`],[dutyRevisionSource(model.record)],['Tarih, Çocuk kimliği, Durum ve Sabit sütunları düzenlenebilir. İçe aktarmada farklar tek tek seçilir.'],['Tarih','Çocuk','Durum','Sabit','Çocuk kimliği','Satır kimliği','Bitiş tarihi']];
 for(const row of model.rows)rows.push([serial(row.startOn),row.studentName,dutyStatusLabel(row.status),row.locked?'Evet':'Hayır',row.studentId,row.id,serial(row.endOn)]);
 const sheet=x.utils.aoa_to_sheet(rows);sheet['!cols']=[{wch:15},{wch:34},{wch:20},{wch:10},{wch:39},{wch:39,hidden:true},{wch:15}];sheet['!rows']=rows.map((_,i)=>({hpt:i===0?30:i<5?25:i===5?32:34}));sheet['!merges']=Array.from({length:5},(_,r)=>({s:{r,c:0},e:{r,c:6}}));sheet['!autofilter']={ref:`A6:G${rows.length}`};sheet['!margins']={left:.3,right:.3,top:.45,bottom:.45,header:.2,footer:.2};
 x.utils.book_append_sheet(book,sheet,'Yazdırma');
 const data=x.utils.aoa_to_sheet(rows.slice(5));data['!cols']=sheet['!cols'];data['!rows']=rows.slice(5).map(()=>({hpt:32}));data['!autofilter']={ref:'A1:G'+String(rows.length-5)};x.utils.book_append_sheet(book,data,DATA);
 x.utils.book_append_sheet(book,x.utils.aoa_to_sheet([['Biçim',FORMAT],['Çizelge kimliği',w.scheduleId],['Sürüm',w.revision],['Kaynak kayıt',model.record.id],['Satır sayısı',model.rows.length]]),META);
 const people=x.utils.aoa_to_sheet([['Çocuk kimliği','Çocuk'],...model.students.map(s=>[s.id,s.label])]);people['!cols']=[{wch:39},{wch:34}];x.utils.book_append_sheet(book,people,PEOPLE);
 x.utils.book_append_sheet(book,x.utils.aoa_to_sheet([['Kullanım'],['Tarih hücresine gerçek Excel tarihi girin. Bitiş tarihi haftanın çocuğunda uygulama tarafından yeniden hesaplanır; bu sütunu değiştirmeyin.'],['Çocuk değiştirirken Çocuklar sayfasındaki kimliği Çocuk kimliği sütununa kopyalayın. Çocuk adı kaynak olarak kullanılmaz; kayıtlı ad uygulamada korunur.'],['Durum: Planlandı / Gerçekleşti / Gerçekleşmedi / İptal edildi. Gelecekte gerçekleşme kaydedilemez.'],['Boş hücre satır silmez. İptal için açıkça İptal edildi yazın. Satır kimliklerini değiştirmeyin ve satır silmeyin.'],['Dosya kendi kaynak sürümüyle karşılaştırılır. Yeni sürüm varsa güncel Excel dosyasını indirin.'],['Renk yalnız okunabilirlik içindir; anlam sütun başlıklarında ve metinlerde korunur.']]),'Açıklamalar');
 for(let i=0;i<model.rows.length;i++){const display=i+7,input=i+2;for(const col of ['A','C','D'])sheet[`${col}${display}`]!.f=`'Veri'!${col}${input}`;sheet[`B${display}`]!.f=`IFERROR(VLOOKUP('Veri'!E${input},'Çocuklar'!$A$2:$B$${model.students.length+1},2,FALSE),'Veri'!B${input})`;}
 book.Workbook={Names:[{Name:'_xlnm.Print_Titles',Ref:"'Yazdırma'!$1:$6",Sheet:0},{Name:'_xlnm.Print_Area',Ref:`'Yazdırma'!$A$1:$D$${rows.length}`,Sheet:0},{Name:'DutyChildren',Ref:`'Çocuklar'!$A$2:$A$${model.students.length+1}`}]};
 const zip=x.CFB.read(new Uint8Array(x.write(book,{type:'array',bookType:'xlsx'})),{type:'array'});
 const patch=(path:string,fn:(s:string)=>string)=>{const e=x.CFB.find(zip,`Root Entry/${path}`);if(!e?.content)throw Error('Çizelge Excel paketi tamamlanamadı.');e.content=new TextEncoder().encode(fn(new TextDecoder().decode(e.content).replace(/<ignoredErrors>[\s\S]*?<\/ignoredErrors>/gu,'')));e.size=e.content.length;};
 patch('xl/styles.xml',()=>styles);
 patch('xl/worksheets/sheet1.xml',xml=>{
  let out=xml.replace(/<c\b([^>]*\br="([A-Z]+)(\d+)"[^>]*)>/gu,(_,attrs:string,col:string,row:string)=>{const n=Number(row),style=n===1?4:n<6?0:n===6?1:(col==='A'||col==='G')?3:(n%2===0?5:2);return `<c${attrs.replace(/\s+s="\d+"/gu,'')} s="${style}">`;});
  out=out.replace(/<sheetViews>[\s\S]*?<\/sheetViews>/u,'<sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="6" topLeftCell="A7" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>');
  out=out.replace('</worksheet>',`<pageSetup paperSize="9" orientation="portrait" fitToWidth="1" fitToHeight="0"/><headerFooter><oddFooter>&amp;L${wordXmlText(model.classroomName)} · v${w.revision}&amp;R&amp;P / &amp;N</oddFooter></headerFooter></worksheet>`);return out;
 });
 patch('xl/worksheets/sheet2.xml',xml=>xml.replace(/<sheetViews>[\s\S]*?<\/sheetViews>/u,'<sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>').replace(/<c\b([^>]*\br="([A-Z]+)(\d+)"[^>]*)>/gu,(_,a:string,c:string,r:string)=>`<c${a.replace(/\s+s="\d+"/gu,'')} s="${r==='1'?1:(c==='A'||c==='G')?3:2}">`).replace('</worksheet>',`<dataValidations count="3"><dataValidation type="list" allowBlank="0" showErrorMessage="1" sqref="C2:C${rows.length-5}"><formula1>"Planlandı,Gerçekleşti,Gerçekleşmedi,İptal edildi"</formula1></dataValidation><dataValidation type="list" allowBlank="0" showErrorMessage="1" sqref="D2:D${rows.length-5}"><formula1>"Evet,Hayır"</formula1></dataValidation><dataValidation type="list" allowBlank="0" showErrorMessage="1" sqref="E2:E${rows.length-5}"><formula1>DutyChildren</formula1></dataValidation></dataValidations></worksheet>`));
 return{bytes:new Uint8Array(x.CFB.write(zip,{type:'array',fileType:'zip',compression:true})),mimeType:DUTY_XLSX_MIME,fileName:`${w.config.kind==='fruit'?'Meyve_Gunu':'Haftanin_Cocugu'}_${w.config.startOn}_v${w.revision}.xlsx`};
}

export async function readClassDutySpreadsheet(bytes:Uint8Array,model:DutyDocumentModel):Promise<{changes:DutyChange[];ignoredNameEdits:number}>{
 if(!bytes.length||bytes.length>5_000_000)throw Error('Bu çizelgenin 5 MB altındaki Excel dosyasını seçin.');
 const x=await import('xlsx'),book=x.read(bytes,{type:'array',cellDates:false,cellFormula:true}),meta=book.Sheets[META],sheet=book.Sheets[DATA];if(!meta||!sheet)throw Error('Bu dosya MaarifOS görev çizelgesi dışa aktarımı değil.');
 const value=(address:string)=>meta[address]?.v;if(value('B1')!==FORMAT||value('B2')!==model.record.workflow.scheduleId||value('B3')!==model.record.workflow.revision||value('B4')!==model.record.id||value('B5')!==model.rows.length)throw Error('Excel dosyasının çizelgesi veya kaynak sürümü değişti. Güncel Excel dosyasını indirin.');
 if(Object.entries(sheet).some(([key,c])=>!key.startsWith('!')&&c&&typeof c==='object'&&'f'in c))throw Error('Görev alanlarında formül kullanılamaz; açık tarih ve seçim girin.');
 const rows=x.utils.sheet_to_json<unknown[]>(sheet,{header:1,raw:true,defval:''}).slice(1).filter(r=>r.some(v=>v!==''));if(rows.length!==model.rows.length)throw Error('Satır eklemek veya silmek yerine uygulamadaki dağıtım ya da iptal işlemini kullanın.');
 const seen=new Set<string>(),changes:DutyChange[]=[];let ignoredNameEdits=0;
 const date=(v:unknown)=>{if(typeof v==='string'&&isCivilDate(v))return v;if(typeof v==='number'&&Number.isInteger(v)){const d=new Date(Date.UTC(1899,11,30)+v*86400000).toISOString().slice(0,10);if(isCivilDate(d))return d;}throw Error('Tarih hücresi boş veya geçersiz. Gerçek Excel tarihi girin.');};
 for(const row of rows){const id=String(row[5]??''),before=model.rows.find(r=>r.id===id);if(!before||seen.has(id))throw Error('Yabancı veya tekrarlanan görev satırı bulundu.');seen.add(id);
  const startOn=date(row[0]),studentId=String(row[4]??''),status=(['planned','completed','missed','cancelled'] as const).find(s=>dutyStatusLabel(s)===row[2]);if(!model.students.some(s=>s.id===studentId)||!status||!['Evet','Hayır'].includes(String(row[3])))throw Error('Çocuk kimliği, durum veya sabit seçimi boş/geçersiz.');
  if(date(row[6])!==before.endOn)throw Error('Bitiş tarihi uygulama tarafından hesaplanır; yalnız başlangıç tarihini düzenleyin.');
  const locked=row[3]==='Evet';if(row[1]!==before.studentName)ignoredNameEdits++;
  if(startOn!==before.startOn||studentId!==before.studentId||status!==before.status||locked!==before.locked)changes.push({rowId:id,...(startOn!==before.startOn?{startOn}:{}),...(studentId!==before.studentId?{studentId}:{}),...(status!==before.status?{status:status as ClassDutyRow['status']} :{}),...(locked!==before.locked?{locked}:{})});
 }
 return{changes,ignoredNameEdits};
}






