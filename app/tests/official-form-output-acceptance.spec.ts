import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { EK15_ITEMS } from "../src/features/official-forms/ek15-catalog.ts";
// Explicit document acceptance needs a Python stdlib interpreter and a PyMuPDF interpreter.
// Keep ordinary browser-only runtime runs independent from local document tooling.
test.skip(!process.env.DOCX_QA_PYTHON || !process.env.PDF_QA_PYTHON, "Set DOCX_QA_PYTHON and PDF_QA_PYTHON for document output acceptance.");
const school="Çıktı Kabul Kurgu Okulu",teacher="Kurgusal Öğretmen Şule Işık",placeholder="PLACEHOLDER_KABUL_VERISI_DEGIL";
async function setup(page:Page){
 await page.setViewportSize({width:390,height:844});await page.goto("/?native=1");
 const form=page.getByRole("dialog",{name:"Sınıfını hazırla",exact:true});
 await form.getByLabel("Okul adı",{exact:true}).fill(school);await form.getByLabel("Öğretmen adı soyadı",{exact:true}).fill(teacher);
 await form.getByLabel("Sınıf adı",{exact:true}).fill("Kurgusal Çıktı Sınıfı");await form.getByLabel("Maarif Modeli yaş grubu",{exact:true}).selectOption({label:"60–72 ay"});
 await form.getByRole("button",{name:"Sınıfımı hazırla",exact:true}).click();await expect(form).toBeHidden();
 await page.getByRole("button",{name:"Planlar",exact:true}).click();await page.getByRole("button",{name:"Günlük plan Etkinlik akışı, rutinler ve değerlendirme",exact:true}).click();
 const workspace=page.getByRole("dialog",{name:"Form çalışma alanı",exact:true});await expect(workspace).toBeVisible();await expect(workspace.getByLabel("Okul adı",{exact:true})).toHaveValue(school);
}
async function choose(page:Page,query:string,title:RegExp){await page.getByRole("button",{name:"Form değiştir",exact:true}).click();const picker=page.getByRole("dialog",{name:"Form seç",exact:true});await picker.getByLabel("Form ara",{exact:true}).fill(query);await picker.getByRole("button",{name:title}).click();await expect(picker).toBeHidden();}
function inspect(kind:"docx"|"pdf",file:string){const python=(kind==="pdf"?process.env.PDF_QA_PYTHON:process.env.DOCX_QA_PYTHON)||"python";return JSON.parse(execFileSync(python,[path.resolve("tests/official-document-output-inspect.py"),kind,file],{encoding:"utf8",maxBuffer:16*1024*1024,windowsHide:true}));}
for(const kind of ["daily","monthly","ek15"] as const){test(`${kind} real download and isolated A4 print preserve Turkish content`,async({page},info)=>{
 test.setTimeout(90000);const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));await setup(page);
 if(kind==="monthly")await choose(page,"EK-5",/EK-5 Aylık Plan/);if(kind==="ek15")await choose(page,"EK-15",/EK-15 Kontrol Çizelgesi/);
 const sentinel=`KURGU_${kind}_Türkçe_ığüşöçİ_tek_kayıt`,tail=`SON_${kind}_kayıp_olmamalı`;
 if(kind!=="ek15"){
  const field=page.getByLabel(kind==="daily"?"Alan becerileri":"Öğrenme yaşantıları",{exact:true});await field.fill(`${sentinel}\n`+Array.from({length:28},(_,i)=>`${i+1}. Kurgusal öğretmen metni; çocukların somut materyalle keşif planı.`).join("\n")+`\n${tail}`);
  await page.getByLabel(kind==="daily"?"Sözcükler":"Belirli gün ve haftalar",{exact:true}).evaluate((el,text)=>el.setAttribute("placeholder",text),placeholder);
  await expect(page.getByRole("status").filter({hasText:"Kayıt cihazda saklı"})).toBeVisible();
 }else{await expect(page.locator(".of-checklist-card")).toHaveCount(247);await expect(page.locator('.of-checklist-month-chip[aria-pressed="true"]')).toHaveCount(0);await page.getByRole("button",{name:"TADB.1 Eylül",exact:true}).click();await expect(page.getByRole("status").filter({hasText:"Kayıt cihazda saklı"})).toBeVisible();}
 await page.locator("summary").filter({hasText:"Çıktıyı hazırla"}).click();
 const downloading=page.waitForEvent("download");await page.getByRole("button",{name:/Word.*docx/}).click();const download=await downloading;expect(download.suggestedFilename()).toMatch(/\.docx$/);
 const docxPath=info.outputPath(`${kind}.docx`);await download.saveAs(docxPath);const word=inspect("docx",docxPath);writeFileSync(info.outputPath(`${kind}-docx-inspection.json`),JSON.stringify(word,null,2));
 expect(word.text).toContain(school);expect(word.text).toContain(teacher);expect(word.text).not.toContain(placeholder);expect(word.provenance).toMatch(/sürüm \d+; SHA-256 [a-f0-9]{64}/);expect(word.tables).toBeGreaterThan(0);
 expect(word.adjacentTables).toBe(0);for(const table of word.tableLayouts){expect(table.columns.length).toBeGreaterThan(0);expect(table.columns.reduce((sum:number,width:number)=>sum+width,0)).toBe(Number(word.page.w)-1440);}
 if(kind!=="ek15"){expect(word.tableLayouts[0].columns).toHaveLength(4);expect(Math.max(...word.tableLayouts[0].columns)/Math.min(...word.tableLayouts[0].columns)).toBeLessThan(2);expect(word.tableLayouts.some((table:{spans:number[]})=>table.spans.includes(2))).toBe(true);}
 if(kind!=="ek15"){expect(word.text.split(sentinel).length-1).toBe(1);expect(word.text).toContain(tail);}else{expect(word.text).toContain("TADB.1");expect(word.text).toContain("D20.3");expect(word.text).toContain("Açık-Koyu");}
 // Pause timers during capture to keep the production two-second cleanup from racing the PDF artifact.
 await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+100));await page.evaluate(()=>{(window as any).__acceptancePrintCalls=0;window.print=()=>{(window as any).__acceptancePrintCalls++;};});
 await page.getByRole("button",{name:/A4 Yazdır/}).click();await expect(page.locator("#maarif-print-container")).toBeAttached();await page.clock.runFor(180);expect(await page.evaluate(()=>(window as any).__acceptancePrintCalls)).toBe(1);
 const print=page.locator("#maarif-print-container");await expect(print.locator("input,textarea,select,button,.no-print")).toHaveCount(0);expect(await print.innerText()).not.toContain(placeholder);
 await page.emulateMedia({media:"print"});const pdfPath=info.outputPath(`${kind}.pdf`);await page.pdf({path:pdfPath,printBackground:true,preferCSSPageSize:true});const pdf=inspect("pdf",pdfPath);writeFileSync(info.outputPath(`${kind}-pdf-inspection.json`),JSON.stringify(pdf,null,2));
 expect(pdf.text).toContain(school);expect(pdf.text).toContain(teacher);expect(pdf.text).not.toContain(placeholder);expect(pdf.text).not.toContain("Form değiştir");expect(pdf.text).not.toContain("Çıktıyı hazırla");
 if(kind!=="ek15"){expect(pdf.text.split(sentinel).length-1).toBe(1);expect(pdf.text).toContain(tail);}else{expect(pdf.text).toContain("TADB.1");expect(pdf.text).toContain("D20.3");expect(pdf.text).toContain("Açık-Koyu");}
 for(const item of pdf.pages){expect(item.text.trim().length).toBeGreaterThan(10);expect(item.outsideTextBounds).toEqual([]);expect(Math.round(Math.min(item.width,item.height))).toBe(595);expect(Math.round(Math.max(item.width,item.height))).toBe(842);}
 if(kind==="ek15"){for(const item of EK15_ITEMS){expect(word.text.replace(/\s+/g,""),`DOCX row ${item.id}`).toContain(item.description.replace(/\s+/g,""));expect(pdf.text.replace(/\s+/g,""),`PDF row ${item.id}`).toContain(item.description.replace(/\s+/g,""));}expect(word.text.split("✓").length-1).toBe(1);expect(pdf.text.split("✓").length-1).toBe(1);}
 const landscape=kind==="ek15";expect(Number(word.page.w)>Number(word.page.h)).toBe(landscape);expect(pdf.pages[0].width>pdf.pages[0].height).toBe(landscape);expect(errors).toEqual([]);
});}
