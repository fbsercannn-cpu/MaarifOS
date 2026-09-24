import { test, expect, type Page } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import * as XLSX from "xlsx";

const output = process.env.CLASS_ROSTER_OUTPUT_DIR ?? "output/class-roster-vibrant-2026-09-08";
test.use({ viewport: { width: 390, height: 844 } });
test.describe.configure({ timeout: 120000 });

async function openFixture(page: Page) {
  await mkdir(output,{recursive:true});
  await page.goto("/tests/pdf-preview-fixture.html");
  await expect(page.getByRole("button",{name:"Kurgu kaynağı değiştir",exact:true})).toBeVisible();
}
async function savePdf(page: Page, name: string) {
  const dialog=page.getByRole("dialog",{name:"PDF önizlemesi",exact:true});
  await expect(dialog.locator("canvas[data-pdf-rendered=true]").first()).toBeVisible({timeout:30000});
  await expect(dialog.getByRole("button",{name:"Bu PDF'yi indir",exact:true})).toBeEnabled();
  const event=page.waitForEvent("download");
  await dialog.getByRole("button",{name:"Bu PDF'yi indir",exact:true}).click();
  await (await event).saveAs(`${output}/${name}.pdf`);
  return readFile(`${output}/${name}.pdf`);
}
async function openSecondaryActions(dialog: ReturnType<Page["getByRole"]>) {
  const menu=dialog.locator("details.pdf-preview-secondary-actions");
  if(await menu.getAttribute("open")===null) await menu.locator("summary").click();
}

test("390px 20 alan ve tüm öğrenciler seçili; bağımsız kapsam, sıfır seçim, şablon geçişi ve gerçek XLSX",async({page})=>{
  await openFixture(page);
  const errors:string[]=[]; page.on("pageerror",error=>errors.push(error.message));
  await page.evaluate(async()=>{
    const {classRosterFixture}=await import("/tests/fixtures/class-roster-fixture.mjs");
    const {createSimpleClassRosterPdfDocument}=await import("/src/features/students/simple-class-roster-document.ts");
    const {downloadBrowserFile}=await import("/src/features/documents/browser-file-download.ts");
    const input=classRosterFixture(1); input.snapshot.students[0].optionalCode="0000842";
    downloadBrowserFile(await createSimpleClassRosterPdfDocument(input));
  });
  const dialog=page.getByRole("dialog",{name:"PDF önizlemesi",exact:true});
  await expect(dialog.locator("canvas[data-pdf-rendered=true]").first()).toBeVisible({timeout:30000});
  await openSecondaryActions(dialog);
  const fields=dialog.locator("fieldset").filter({has:page.locator("legend",{hasText:"Belgeye alınacak alanlar"})});
  expect(await fields.locator('input[type="checkbox"]:checked').count()).toBe(20);
  const students=dialog.getByRole("group",{name:"Öğrenci kapsamı",exact:true});
  expect(await students.locator('input[type="checkbox"]:checked').count()).toBe(1);
  await expect(dialog.getByRole("button",{name:"Yazdır",exact:true})).toBeEnabled();
  await expect(dialog.getByRole("button",{name:"Excel'e çıkar",exact:true})).toBeEnabled();
  await expect(dialog.getByRole("button",{name:"Kısa iletişim baskısı",exact:true})).toBeEnabled();
  await page.screenshot({path:`${output}/columns-all-390.png`});
  await dialog.getByRole("button",{name:"Alan seçimini temizle",exact:true}).click();
  for(const name of ["Bu PDF'yi indir","Yazdır","Excel'e çıkar","Kısa iletişim baskısı"]) await expect(dialog.getByRole("button",{name,exact:true})).toBeDisabled();
  await fields.getByLabel("Okul numarası",{exact:true}).check();
  const bytes=await savePdf(page,"school-number-only");
  const text=spawnSync("pdftotext",["-raw","-","-"],{input:bytes,encoding:"utf8"});
  expect(text.status).toBe(0); expect(text.stdout).toContain("0000842");
  expect(text.stdout).not.toMatch(/Kurgu İpek Deniz|Kurgu Anne|Kurgu Baba|10000000146|Öğretmenler Caddesi/u);
  await openSecondaryActions(dialog);
  const event=page.waitForEvent("download"); await dialog.getByRole("button",{name:"Excel'e çıkar",exact:true}).click();
  await (await event).saveAs(`${output}/school-number-only.xlsx`);
  const book=XLSX.read(await readFile(`${output}/school-number-only.xlsx`),{type:"buffer"});
  expect(book.SheetNames).toHaveLength(1);
  const values=XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]!]!,{header:1,raw:true}) as unknown[][];
  expect(values.flat()).toContain("0000842");
  expect(JSON.stringify(values)).not.toMatch(/Kurgu İpek Deniz|Kurgu Anne|Kurgu Baba|10000000146|Öğretmenler Caddesi/u);
  await dialog.getByRole("combobox",{name:"Hazır şablon",exact:true}).selectOption("student-record");
  expect(await fields.locator('input[type="checkbox"]').count()).toBe(4);
  expect(await fields.locator('input[type="checkbox"]:checked').count()).toBe(3);
  await expect(fields.getByLabel("Acil sağlık bilgileri (özel)",{exact:true})).not.toBeChecked();
  await expect(dialog.getByRole("button",{name:"Excel'e çıkar",exact:true})).toHaveCount(0);
  await expect(dialog.getByRole("button",{name:"Kısa iletişim baskısı",exact:true})).toHaveCount(0);
  await dialog.getByRole("combobox",{name:"Hazır şablon",exact:true}).selectOption("contact-list");
  expect(await fields.locator('input[type="checkbox"]:checked').count()).toBe(20);
  await dialog.getByRole("button",{name:"Alan seçimini temizle",exact:true}).click();
  const addressGroup=fields.locator("details").filter({has:page.locator("summary",{hasText:"İletişim ve adres"})});
  if(!await addressGroup.evaluate(el=>(el as HTMLDetailsElement).open)) await addressGroup.locator("summary").click();
  await fields.getByLabel("Ev adresi",{exact:true}).check();
  await savePdf(page,"address-only");
  expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  await page.screenshot({path:`${output}/columns-address-only-390.png`});
  expect(errors).toEqual([]);
});

test("14 sütun 0/1/15/30/40 öğrenci; logolu dikey/yatay tam PDF bytes ve HTML baskı sınırları",async({page})=>{
  await openFixture(page);
  const records:unknown[]=[];
  for(const scenario of ["0","1","15","30","40","styled-portrait","styled-landscape"]) {
    const result=await page.evaluate(async scenario=>{
      const {classRosterFixture,classRosterExtremeFixture}=await import("/tests/fixtures/class-roster-fixture.mjs");
      const {createSimpleClassRosterPdfDocument}=await import("/src/features/students/simple-class-roster-document.ts");
      const {createClassRosterExportModel}=await import("/src/features/classroom/class-roster-document.ts");
      const {downloadBrowserFile}=await import("/src/features/documents/browser-file-download.ts");
      const input=scenario==="15"||scenario.startsWith("styled")?classRosterExtremeFixture():classRosterFixture(Number(scenario));
      if(input.snapshot.students.length) input.snapshot.students[0].optionalCode="0000842";
      if(scenario.startsWith("styled")) {
        const canvas=document.createElement("canvas");canvas.width=64;canvas.height=64;const context=canvas.getContext("2d")!;context.fillStyle="#176b5b";context.fillRect(0,0,64,64);
        input.schoolTemplate={layout:"official",orientation:scenario.endsWith("portrait")?"portrait":"landscape",headerLines:["T.C.",("Kurgu Millî Eğitim Müdürlüğü ".repeat(6)).slice(0,160).trim(),("Kurgu Uzun Okul Başlığı ".repeat(8)).slice(0,160).trim()],logo:{dataUrl:canvas.toDataURL("image/png"),width:64,height:64},signatureLayout:"teacher-and-principal",principalName:"KURGU "+"UZUNSOYADI".repeat(14)};
      }
      const file=await createSimpleClassRosterPdfDocument(input); downloadBrowserFile(file);
      return {bytes:Array.from(file.bytes),html:file.html,pageCount:file.pageCount,model:createClassRosterExportModel(input)};
    },scenario);
    expect(Array.from(await savePdf(page,`roster-${scenario}`))).toEqual(result.bytes);
    await writeFile(`${output}/roster-${scenario}.html`,result.html);
    await writeFile(`${output}/model-${scenario}.json`,JSON.stringify(result.model,null,2));
    records.push({scenario,pages:result.pageCount,studentCount:result.model.metadata.studentCount});
    await page.getByRole("button",{name:"PDF önizlemesini kapat",exact:true}).click();
    const htmlPage=await page.context().newPage();
    await htmlPage.setContent(result.html,{waitUntil:"load"});
    expect(await htmlPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await htmlPage.emulateMedia({media:"print"});
    const portrait=scenario==="styled-portrait";
    const max=await htmlPage.locator(".roster-page").evaluateAll(elements=>Math.max(...elements.map(el=>el.getBoundingClientRect().height)));
    expect(max,`${scenario} HTML baskı yüksekliği`).toBeLessThanOrEqual((portrait?277:190)*96/25.4+1);
    await htmlPage.close();
  }
  await writeFile(`${output}/generated.json`,JSON.stringify(records,null,2));
});
