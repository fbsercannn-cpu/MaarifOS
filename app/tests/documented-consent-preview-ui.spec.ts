import {test,expect} from "@playwright/test";
test("MR098 önizleme açıkken izin geri çekilirse eski PDF dışarı verilemez",async({page})=>{
 await page.goto("/tests/pdf-preview-fixture.html");await expect(page.getByRole("button",{name:"Kurgu kaynağı değiştir"})).toBeVisible();
 await page.evaluate(async()=>{
  const {requestPdfDocument}=await import("/src/features/documents/pdf-preview-model.ts");
  const {createSemanticTaggedPdf}=await import("/src/features/documents/semantic-tagged-pdf.ts");
  (window as any).kurguConsentAllowed=true;
  void requestPdfDocument({title:"Kurgu izin denetimi",fields:[{id:"portfolio",label:"Portfolyo"}],initial:{fields:["portfolio"]},async assertExportAllowed(){if(!(window as any).kurguConsentAllowed)throw Error("Kurgu portfolyo izni geri çekildi; belge dışarı verilemez.")},async build(){return{bytes:await createSemanticTaggedPdf({title:"Kurgu Portfolyo",language:"tr-TR",nodes:[{kind:"heading",level:1,text:"Kurgu Portfolyo"},{kind:"paragraph",text:"Yalnız sentetik test içeriği."}]}),mimeType:"application/pdf",fileName:"kurgu-portfolyo.pdf"}}});
 });
 const preview=page.getByRole("dialog",{name:"PDF önizlemesi",exact:true});await expect(preview.locator("canvas[data-pdf-rendered=true]")).toBeVisible({timeout:30000});
 let downloads=0;page.on("download",()=>downloads++);await page.evaluate(()=>{(window as any).kurguConsentAllowed=false;(window as any).kurguShares=0;Object.defineProperty(navigator,"share",{configurable:true,value:async()=>{(window as any).kurguShares++}});Object.defineProperty(navigator,"canShare",{configurable:true,value:()=>true})});await preview.getByRole("button",{name:"Bu PDF'yi indir",exact:true}).click();await expect(preview.getByRole("alert")).toContainText("izni geri çekildi");expect(downloads).toBe(0);
 await preview.getByRole("button",{name:"Bu PDF'yi paylaş",exact:true}).click();await expect(preview.getByRole("alert")).toContainText("izni geri çekildi");expect(await page.evaluate(()=>(window as any).kurguShares)).toBe(0);expect(downloads).toBe(0);
});
