import { PDFDocument, rgb } from "pdf-lib";
import { canonicalJson } from "../../core/backup/canonical-json.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import { ACCESSIBLE_PDF_FONT_ASSET_PATH, createSemanticTaggedPdf, type SemanticPdfNode } from "../documents/semantic-tagged-pdf.ts";
import { validatePdfSelection, type PdfPreviewRecipe } from "../documents/pdf-preview-model.ts";
import { TEACHER_DOCUMENT_THEME } from "../documents/document-theme.ts";
import { loadMaterialBoxModel, type MaterialBox, type MaterialBoxModel } from "./material-box-service.ts";

const W=595.28,H=841.89,LEFT=28,CW=(W-56)/3,PAD=9;
const selectedStudents=(model:MaterialBoxModel,ids:readonly string[])=>model.students.filter(s=>model.boxes.some(b=>ids.includes(b.id)&&b.studentIds.includes(s.id)));
const sourceValue=(model:MaterialBoxModel,ids:readonly string[])=>canonicalJson({scope:model.scope,school:model.schoolName,classroom:model.classroomName,weekStart:model.weekStart,weekEnd:model.weekEnd,boxes:ids.map(id=>model.boxes.find(b=>b.id===id)??null),students:selectedStudents(model,ids)});
export async function createMaterialBoxPdf(model:MaterialBoxModel,ids:readonly string[]):Promise<Uint8Array>{
  const boxes=ids.map(id=>model.boxes.find(b=>b.id===id));if(!boxes.length||boxes.some(b=>!b)||new Set(ids).size!==ids.length)throw new Error("Etiket için gerçek merkez kutularını seçin.");
  const response=await fetch(ACCESSIBLE_PDF_FONT_ASSET_PATH,{cache:"force-cache"});if(!response.ok)throw new Error("Etiket yazı tipi yüklenemedi.");const fontBytes=new Uint8Array(await response.arrayBuffer());
  const face=await new FontFace("MaterialBoxLabelFont",fontBytes).load();document.fonts.add(face);
  try {
  const context=document.createElement("canvas").getContext("2d");if(!context)throw new Error("Etiket yazısı ölçülemedi.");
  const width=(text:string,size:number)=>{context.font=`${size*96/72}px MaterialBoxLabelFont`;return context.measureText(text).width*72/96;};
  const wrap=(text:string,size:number,limit=CW-PAD*2)=>{const lines:string[]=[];let line="";for(const char of text){if(char==="\n"){lines.push(line);line="";}else if(width(line+char,size)>limit){const space=line.lastIndexOf(" ");if(space>0){lines.push(line.slice(0,space));line=line.slice(space+1)+char;}else{lines.push(line);line=char;}}else line+=char;}if(line)lines.push(line);return lines;};
  const headerLines=wrap(`${model.schoolName} · ${model.classroomName}`,8.5,W-LEFT*2),TOP=Math.max(82,49+headerLines.length*11+17),CH=(H-55-TOP)/4;
  const cards:{box:MaterialBox;title:string[];lines:string[];part:number;total:number}[]=[];
  for(const box of boxes as MaterialBox[]){const title=wrap(box.title,10);const body=wrap(["İÇERİK",...(box.contents.length?box.contents:["Malzeme tahsisi kaydı yok"]),"KAYNAK ETKİNLİKLER",...(box.activities.length?box.activities.map(a=>a.title):["Bu hafta aynı malzemeyi kullanan kayıtlı etkinlik yok."]),...(box.prepared?["Kutu hazır"]:[])].join("\n"),9);const capacity=Math.max(4,Math.floor((CH-PAD*2-title.length*12-14)/11));const total=Math.ceil(body.length/capacity);for(let part=0;part<total;part++)cards.push({box,title,lines:body.slice(part*capacity,(part+1)*capacity),part:part+1,total});}
  const nodes:SemanticPdfNode[]=[];
  const line=(text:string,x:number,y:number,size:number)=>nodes.push({kind:"paragraph",text,placement:{x,y,width:Math.max(0.1,width(text,size)),height:size*1.25,fontSize:size}});
  for(let page=0;page<Math.ceil(cards.length/12);page++){
    nodes.push({kind:"heading",level:1,text:"Malzeme kutusu etiketleri",pageBreakBefore:page>0,forcePageBreakBefore:page>0});
    headerLines.forEach((text,index)=>line(text,LEFT,49+index*11,8.5));line(`${model.weekStart} - ${model.weekEnd} · A4 / 12 kesim alanı`,LEFT,49+headerLines.length*11,8.5);
    for(let slot=0;slot<12;slot++){const card=cards[page*12+slot];if(!card)continue;const x=LEFT+(slot%3)*CW+PAD;let y=TOP+Math.floor(slot/3)*CH+PAD;
      for(const title of card.title){line(title,x,y,10);y+=12;}if(card.total>1){line(`İçerik devamı ${card.part}/${card.total}`,x,y,8);y+=11;}else y+=4;
      for(const text of card.lines){line(text,x,y,9);y+=11;}
    }
  }
  const base=await createSemanticTaggedPdf({title:"Malzeme kutusu etiketleri",theme:TEACHER_DOCUMENT_THEME,pageMargin:LEFT,includeTotalPages:true,artifactFooterText:"Kesik çizgilerden kesin · Uzun içerik numaralı devam etiketlerinde korunur",nodes},{fontBytes});
  const pdf=await PDFDocument.load(base);if(pdf.getPageCount()!==Math.ceil(cards.length/12))throw new Error("Etiket sayfa düzeni doğrulanamadı.");
  for(const page of pdf.getPages())for(let slot=0;slot<12;slot++)page.drawRectangle({x:LEFT+(slot%3)*CW,y:H-TOP-(Math.floor(slot/3)+1)*CH,width:CW,height:CH,borderWidth:0.6,borderColor:rgb(0.2,0.45,0.5),borderDashArray:[3,2]});
  return await pdf.save({useObjectStreams:false});
  } finally {document.fonts.delete(face);}
}
export async function createMaterialBoxRecipe(store:LocalDataStore,day:string,boxIds:readonly string[]):Promise<PdfPreviewRecipe>{
  const ids=[...boxIds],model=await loadMaterialBoxModel(store,day);if(!ids.length||ids.some(id=>!model.boxes.some(b=>b.id===id)))throw new Error("Etikete alınacak açık merkez kutularını seçin.");const expected=sourceValue(model,ids),students=selectedStudents(model,ids),studentIds=students.map(s=>s.id);
  const recipe:PdfPreviewRecipe={title:"Malzeme kutusu etiketleri",description:"A4 üzerinde 12 kesilebilir alan. Kayıtlı merkez, ayrılan malzemeler ve aynı malzemeyi kullanan gerçek etkinlikler yerleşir. Uzun içerik devam etiketlerine taşınır.",fields:[{id:"labels",label:"Merkez, içerik ve kaynak etkinlikler"}],...(students.length?{students}:{}),initial:{fields:["labels"],...(students.length?{studentIds}:{})},printEnabled:true,refresh:()=>createMaterialBoxRecipe(store,day,ids),
    assertExportAllowed:async selection=>{validatePdfSelection(recipe,selection);if((selection.studentIds??[]).length!==studentIds.length||studentIds.some(id=>!selection.studentIds?.includes(id)))throw new Error("Etiketin kaynak etkinliklerinde kayıtlı çocuk kapsamı birlikte korunmalıdır. Kutuları değiştirerek yeni kapsam seçin.");if(sourceValue(await loadMaterialBoxModel(store,day),ids)!==expected)throw new Error("Seçilen kutunun malzemesi, durumu veya etkinlik kaynağı değişti. Aynı seçimlerle etiketleri güncelleyin.");},
    build:async selection=>{validatePdfSelection(recipe,selection);if(!selection.fields.includes("labels"))throw new Error("Etiket alanını seçin.");await recipe.assertExportAllowed!(selection);return{bytes:await createMaterialBoxPdf(model,ids),mimeType:"application/pdf",fileName:`Malzeme_Kutusu_Etiketleri_${model.weekStart}.pdf`};}};return recipe;
}
