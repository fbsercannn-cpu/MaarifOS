import { PDFDocument, rgb } from "pdf-lib";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import { resolveActiveClassroomScope } from "../../core/domain/classroom-scope.ts";
import { createSemanticTaggedPdf, type SemanticTaggedPdfRuntime } from "../documents/semantic-tagged-pdf.ts";
import { TEACHER_DOCUMENT_THEME } from "../documents/document-theme.ts";
import { validatePdfSelection, type PdfPreviewRecipe } from "../documents/pdf-preview-model.ts";
import { homeGameCards, homeGameSource, type HomeGameCardRecord } from "./home-game-card-model.ts";

export async function createHomeGameCardRecipe(store: LocalDataStore, cardIds: string[], runtime: SemanticTaggedPdfRuntime = {}): Promise<PdfPreviewRecipe> {
  const snapshot = await store.readSnapshot();
  const cards = cardIds.map(id => homeGameCards(snapshot).find(r => r.id === id));
  if (!cards.length || new Set(cardIds).size !== cardIds.length || cards.some(r => !r || r.workflow.kind !== "prepared")) throw new Error("Yazdırmak için kayıtlı ev oyunu kartını seçin.");
  const records = cards as HomeGameCardRecord[];
  const scope = resolveActiveClassroomScope(snapshot);
  if (!scope || records.some(r => r.academicYearId !== scope.academicYearId || r.classroomId !== scope.classroomId)) throw new Error("Kartın kayıtlı sınıfını açın.");
  const sources = records.map(card => {
    if (card.workflow.kind !== "prepared") throw new Error("Kart bulunamadı.");
    return homeGameSource(snapshot, card, card.studentId, card.workflow.activityId);
  });
  const expected = JSON.stringify({ records, sources });
  const assertExportAllowed = async () => {
    const fresh = await store.readSnapshot();
    if (JSON.stringify(resolveActiveClassroomScope(fresh)) !== JSON.stringify(scope)) throw new Error("Etkin sınıf değişti. Kartı yeniden açın.");
    const nextRecords = cardIds.map(id => homeGameCards(fresh).find(r => r.id === id));
    const nextSources = records.map(card => homeGameSource(fresh, card, card.studentId, card.workflow.kind === "prepared" ? card.workflow.activityId : ""));
    if (JSON.stringify({ records: nextRecords, sources: nextSources }) !== expected) throw new Error("Kartın kaynakları değişti. Aynı seçimlerle güncelleyin.");
  };
  const recipe: PdfPreviewRecipe = {
    title: "Aileye ev oyunu kartı", description: "A4 üzerinde iki A5 kart. Tek çocukta iki nüsha; uzun metinler aynı çocuğun devam kartlarında eksiksiz yer alır. Hazırlamak, aileye gönderildiği veya uygulandığı anlamına gelmez.",
    fields: [{id:"card",label:"Oyun, malzeme ve boş aile yanıt alanı"}], students: sources.map(s => ({id:s.studentId,label:s.name})), initial: {fields:["card"],studentIds:sources.map(s=>s.studentId)}, printEnabled: true, assertExportAllowed,
    refresh: () => createHomeGameCardRecipe(store, cardIds, runtime),
    async build(selection) {
      validatePdfSelection(recipe,selection); await assertExportAllowed();
      const chosen = records.filter(r => selection.studentIds?.includes(r.studentId));
      if (!chosen.length) throw new Error("En az bir çocuk seçin.");
      const pdf = await PDFDocument.create(); pdf.setTitle("Aileye ev oyunu kartı"); pdf.setLanguage("tr-TR");
      const pages: Awaited<ReturnType<typeof pdf.embedPdf>>[number][] = [];
      for (const card of chosen.length === 1 ? [...chosen,...chosen] : chosen) {
        const w = card.workflow; if (w.kind !== "prepared") continue;
        const source = sources.find(s=>s.studentId===card.studentId)!;
        const bytes = await createSemanticTaggedPdf({title:"Ev oyunu", pageFormat:"A5",orientation:"landscape", pageMargin:28, theme:TEACHER_DOCUMENT_THEME, artifactHeaderText:`${source.name} · ${w.title} · devam`, artifactHeaderOnFirstPage:false, artifactFooterText:"MaarifOS · Aile oyun kartı", nodes:[
          {kind:"heading",level:2,text:"BİRLİKTE OYNAYALIM"},
          {kind:"paragraph",text:`${source.name} · ${w.title}`},
          {kind:"paragraph",tone:"meta",text:`Kaynak etkinlik: ${source.civilDate} · Kart hazırlama: ${card.civilDate}`},
          {kind:"heading",level:4,text:"Malzemeler"},{kind:"paragraph",text:w.materials},
          {kind:"heading",level:4,text:"Oyun adımları"},{kind:"paragraph",text:w.steps},
          {kind:"heading",level:4,text:"Aileden geri bildirim"},
          {kind:"paragraph",text:"Birlikte neler yaptınız? Çocuğunuz neler söyledi veya yaptı?"},
          {kind:"paragraph",text:"Tarih: ____________________    Yanıtı yazan: ____________________"},
          {kind:"paragraph",text:"__________________________________________________________________\n__________________________________________________________________"},
        ]},runtime);
        const sourcePdf = await PDFDocument.load(bytes);
        pages.push(...await pdf.embedPdf(sourcePdf, sourcePdf.getPageIndices()));
      }
      for(let i=0;i<pages.length;i+=2) {
        const page=pdf.addPage([595.28,841.89]);
        page.drawPage(pages[i]!,{x:0,y:420.945,width:595.28,height:420.945});
        if(pages[i+1]) page.drawPage(pages[i+1]!,{x:0,y:0,width:595.28,height:420.945});
        page.drawLine({start:{x:14,y:420.945},end:{x:581.28,y:420.945},thickness:0.6,dashArray:[4,4],color:rgb(.38,.49,.57)});
      }
      await assertExportAllowed();
      return {bytes:await pdf.save(),mimeType:"application/pdf",fileName:`MaarifOS_Ev_Oyunu_${cardIds[0]}.pdf`};
    },
  };
  return recipe;
}

