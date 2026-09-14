import type { LocalDataStore } from "../../core/repository/contracts.ts";
import { createSemanticTaggedPdf, type SemanticPdfNode, type SemanticTaggedPdfRuntime } from "../documents/semantic-tagged-pdf.ts";
import { TEACHER_DOCUMENT_THEME } from "../documents/document-theme.ts";
import { validatePdfSelection, type PdfPreviewRecipe, type PdfPreviewSelection } from "../documents/pdf-preview-model.ts";
import { createBinaryZip } from "../documents/binary-zip.ts";
import { generateMonthEndPackage, loadMonthPackageInventory } from "../documents/month-end-package.ts";
import { loadPickupSheet, loadBinderKit, type PickupSheetModel, type BinderKitModel } from "./print-kit-model.ts";

const dateLabel = (value:string) => value.split("-").reverse().join(".");
const timeLabel = (value:string) => new Intl.DateTimeFormat("tr-TR",{timeZone:"Europe/Istanbul",hour:"2-digit",minute:"2-digit"}).format(new Date(value));
const monthLabel = (value:string) => new Intl.DateTimeFormat("tr-TR",{timeZone:"UTC",month:"long",year:"numeric"}).format(new Date(`${value}-01T12:00:00Z`));
export function pickupSheetNodes(model:PickupSheetModel, studentIds:readonly string[], fields:readonly string[]):SemanticPdfNode[] {
  const rows=model.rows.filter(r=>studentIds.includes(r.studentId));
  const headers=["Sıra","Çocuk","Kayıtlı yetkili kişi",...(fields.includes("phones")?["Telefon"]:[]),...(fields.includes("actual")?["Gerçek teslim kaydı"]:[]),"Teslim alanın imzası"];
  return [{kind:"heading",level:1,text:"Günlük teslim çizelgesi"},{kind:"paragraph",tone:"meta",text:`${model.schoolName}\n${model.classroomName} · ${dateLabel(model.civilDate)} · ${model.yearName}`},
    {kind:"table",headers,rows:rows.map((r,i)=>[String(i+1),r.studentName,r.contacts.length?r.contacts.map(c=>`${c.name || "Ad kaydı yok"}\n${c.relationship}`).join("\n\n"):"Kayıtlı teslim yetkilisi yok",...(fields.includes("phones")?[r.contacts.map(c=>c.phone).join("\n\n")]:[]),...(fields.includes("actual")?[r.deliveries.map(d=>`${timeLabel(d.handedOverAt)} · ${d.contact.name}`).join("\n") || (r.correctionCount?"Önceki kayıt düzeltildi; geçerli teslim kaydı yok":"")]:[]),"\n"]),columnWeights:[0.65,1.8,2,...(fields.includes("phones")?[1.25]:[]),...(fields.includes("actual")?[1.7]:[]),2.5],fontSize:10,cellPadding:3,rowHeaderColumn:1,balancePages:true,reserveAfter:"following-content"},
    {kind:"paragraph",tone:"meta",text:`${model.teacherName} · Okul Öncesi Öğretmeni\nYetkili kişi sütunu kayıtlı güncel yetkiyi, teslim sütunu varsa gerçek teslim kaydını gösterir.`}];
}
export async function createPickupSheetPdf(model:PickupSheetModel,studentIds=model.rows.map(r=>r.studentId),fields=["roster","phones","actual"],runtime:SemanticTaggedPdfRuntime={}) {
  return createSemanticTaggedPdf({title:"Günlük teslim çizelgesi",orientation:"landscape",theme:TEACHER_DOCUMENT_THEME,includeTotalPages:true,artifactHeaderText:`${model.classroomName} · ${dateLabel(model.civilDate)}`,nodes:pickupSheetNodes(model,studentIds,fields)},runtime);
}
export async function createPickupSheetRecipe(store:LocalDataStore,civilDate:string):Promise<PdfPreviewRecipe> {
  const model=await loadPickupSheet(store,civilDate);
  if(!model.rows.length)throw new Error("Bu tarihte çizelgeye alınabilecek öğrenci yok.");
  const recipe:PdfPreviewRecipe={title:"Günlük teslim çizelgesi",description:"Yatay A4 · kayıtlı yetkili kişiler ve gerçek teslim saatleri · geniş boş imza alanı.",fields:[{id:"roster",label:"Çocuk ve kayıtlı teslim yetkilisi"},{id:"phones",label:"Yetkili telefonları"},{id:"actual",label:"Gerçek teslim kayıtları"}],students:model.rows.map(r=>({id:r.studentId,label:r.studentName})),initial:{fields:["roster","phones","actual"],studentIds:model.rows.map(r=>r.studentId)},printEnabled:true,
    refresh:()=>createPickupSheetRecipe(store,civilDate),assertExportAllowed:async selection=>{validatePdfSelection(recipe,selection);if((await loadPickupSheet(store,civilDate)).fingerprint!==model.fingerprint)throw new Error("Teslim yetkisi veya kayıtlar değişti. Aynı seçimlerle güncel çizelgeyi hazırlayın.");},
    build:async selection=>{validatePdfSelection(recipe,selection);if(!selection.fields.includes("roster"))throw new Error("Teslim çizelgesinde çocuk ve yetkili kişi bölümü bulunmalıdır.");return{bytes:await createPickupSheetPdf(model,[...selection.studentIds!],[...selection.fields]),fileName:`Teslim_Cizelgesi_${civilDate}.pdf`,mimeType:"application/pdf"};}};
  return recipe;
}
export function binderKitNodes(model:BinderKitModel,fields:readonly string[]):SemanticPdfNode[] {
  const nodes:SemanticPdfNode[]=[];
  const page=(heading:string)=>nodes.push({kind:"heading",level:1,text:heading,pageBreakBefore:nodes.length>0,forcePageBreakBefore:nodes.length>0});
  const meta=`${model.schoolName}\n${model.classroomName} · ${model.yearName}`;
  if(fields.includes("cover")){page("Öğretmenin aylık dosyası");nodes.push({kind:"paragraph",text:`\n${meta}\n\n${monthLabel(model.month)}\n\n${model.items.length} seçilmiş belge\n\n${model.teacherName}\nOkul Öncesi Öğretmeni`});}
  if(fields.includes("contents")){page("İçindekiler");nodes.push({kind:"paragraph",tone:"meta",text:`${meta}\n${monthLabel(model.month)} · Belge sırası`},{kind:"table",headers:["Sıra","Seçilen belge","Dosya grubu"],rows:model.items.map((item,i)=>[String(i+1),item.title,item.kind==="saved"?"Saklanan sürüm":item.kind==="evaluation"?"Aylık değerlendirme":"Aylık plan ve bağlı planlar"]),columnWeights:[0.7,4,1.6],fontSize:11,cellPadding:9});}
  if(fields.includes("divider")){page(monthLabel(model.month));nodes.push({kind:"paragraph",text:`\n${meta}\n\nAYLIK AYRAÇ\n\n${model.items.length} seçilmiş belge\n\n${model.teacherName}\nOkul Öncesi Öğretmeni`});}
  if(fields.includes("spine")){page("Klasör sırt etiketi");nodes.push({kind:"paragraph",tone:"meta",text:"Soldaki dar çerçeveli etiketi kenarından keserek klasör sırtına yerleştirin."},{kind:"table",headers:["AYLIK DOSYA","Kesim dışında kalan alan"],rows:[[`${model.schoolName}\n\n${model.classroomName}\n\n${monthLabel(model.month)}\n\n${model.yearName}\n\n${model.teacherName}\nOkul Öncesi Öğretmeni`,""]],columnWeights:[1,3],fontSize:11,cellPadding:10});}
  return nodes;
}
export async function createBinderKitPdf(model:BinderKitModel,fields=["cover","contents","divider","spine"],runtime:SemanticTaggedPdfRuntime={}) {
  return createSemanticTaggedPdf({title:"Aylık klasör seti",theme:TEACHER_DOCUMENT_THEME,includeTotalPages:true,artifactHeaderText:`${model.classroomName} · ${monthLabel(model.month)}`,nodes:binderKitNodes(model,fields)},runtime);
}
export async function createBinderKitRecipe(store:LocalDataStore,month:string,selectedIds:readonly string[]):Promise<PdfPreviewRecipe> {
  const model=await loadBinderKit(store,month,selectedIds);if(!model.items.length)throw new Error("Klasöre alınacak en az bir gerçek belge seçin.");
  const validate=(selection:PdfPreviewSelection)=>{validatePdfSelection(recipe,selection);if(model.students.length && (selection.studentIds?.length!==model.students.length || model.students.some(s=>!selection.studentIds?.includes(s.id))))throw new Error("Seçilen belgelerin öğrenci kapsamı birlikte korunmalıdır. Daha dar kapsam için kaynak belgeleri değiştirin.");};
  const current=async()=>{if((await loadBinderKit(store,month,selectedIds)).fingerprint!==model.fingerprint)throw new Error("Seçilen klasör kaynakları değişti. Aynı seçimlerle güncelleyin.");};
  const recipe:PdfPreviewRecipe={title:"Aylık klasör seti",description:"Kapak, belge sırasına göre içindekiler, ayraç ve kesilebilir sırt etiketi. Belge sıra numarası fiziksel sayfa numarası değildir.",fields:[{id:"cover",label:"Klasör kapağı"},{id:"contents",label:"Seçilen belgelerden içindekiler"},{id:"divider",label:"Aylık ayraç"},{id:"spine",label:"Klasör sırt etiketi"}],...(model.students.length?{students:model.students}:{}),initial:{fields:["cover","contents","divider","spine"],...(model.students.length?{studentIds:model.students.map(s=>s.id)}:{})},printEnabled:true,
    refresh:()=>createBinderKitRecipe(store,month,selectedIds),assertExportAllowed:async selection=>{validate(selection);await current();},build:async selection=>{validate(selection);return{bytes:await createBinderKitPdf(model,[...selection.fields]),fileName:`Klasor_Seti_${month}.pdf`,mimeType:"application/pdf"};},
    exportActions:[{id:"package",label:"Klasör setini seçilen belgelerle indir",build:async selection=>{validate(selection);await current();const bytes=await createBinderKitPdf(model,[...selection.fields]);const inventory=await loadMonthPackageInventory(store,month);const documents=await generateMonthEndPackage(store,inventory,selectedIds);await current();return{bytes:createBinaryZip([{name:`00_Klasor_Seti_${month}.pdf`,bytes},{name:documents.fileName,bytes:documents.bytes}]),fileName:`Klasor_ve_Belgeler_${month}.zip`,mimeType:"application/zip"};}}]};return recipe;
}
