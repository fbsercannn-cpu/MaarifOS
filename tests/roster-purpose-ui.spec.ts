import { test, expect } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import * as XLSX from "xlsx";

test("dört kullanım amacı telefonda gerçek PDF ve Excel hazırlar", async ({ page, context }) => {
  test.setTimeout(180000);
  const production = process.env.ROSTER_PURPOSE_PRODUCTION === "1";
  const output = `output/roster-redesign/${production ? "offline" : "browser"}`;
  await mkdir(output, { recursive: true });
  await page.setViewportSize({width:production ? 320 : 390,height:844});
  await page.clock.setFixedTime(new Date("2026-09-17T09:00:00Z"));
  await page.goto("/classroom?native=1");
  const setup = page.getByRole("dialog", { name:"Sınıfını hazırla",exact:true });
  await setup.getByLabel("Okul adı").fill("Kurgu Liste Anaokulu");
  await setup.getByLabel("Öğretmen adı soyadı").fill("Kurgu Öğretmen");
  await setup.getByLabel("Sınıf adı").fill("Kurgu Çiçekler");
  await setup.getByLabel("Maarif Modeli yaş grubu",{exact:true}).selectOption({label:"60–72 ay"});
  await setup.getByRole("button",{name:"Sınıfımı hazırla",exact:true}).click();
  await expect(setup).toBeHidden();
  if(production){
    await expect.poll(()=>page.evaluate(()=>Boolean((window as any).__maarifosPwaStatus?.offlineReady)),{timeout:60000}).toBe(true);
    await context.setOffline(true);
    await page.reload({waitUntil:"domcontentloaded"});
  }
  for(const name of ["Kurgu Deniz Çınar","Kurgu İpek Yıldız"]){
    await page.getByRole("button",{name:"Çocuk ekle",exact:true}).click();
    const add=page.getByRole("dialog",{name:"Çocuk ekle",exact:true});
    await add.getByLabel("Çocuğun adı",{exact:true}).fill(name);
    await add.getByRole("button",{name:"Kaydet ve kapat",exact:true}).click();
    await expect(add).toBeHidden();
  }
  await page.getByText("Sınıf işlemleri",{exact:true}).click();
  const choices=page.getByRole("region",{name:"Sınıf listesi hazır düzenleri",exact:true});
  await choices.scrollIntoViewIfNeeded();
  expect(await choices.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
  await page.screenshot({path:`${output}/purpose-choices.png`});
  for(const [label,id,landscape] of [["Tek sayfa sınıf listesi","single-page-roster",true],["Sınıfta kullan","daily-classroom",false],["İletişim için hazırla","contact-blocks",true],["Ayrıntılı döküm al","detailed-roster",false]] as const){
    await choices.getByRole("button",{name:new RegExp(`^${label}`)}).click();
    const dialog=page.getByRole("dialog",{name:"PDF önizlemesi",exact:true});
    await expect(dialog.locator("canvas[data-pdf-rendered=true]")).toBeVisible({timeout:30000});
    await dialog.locator(".pdf-preview-options > summary").click();
    await expect(dialog.getByLabel("Sayfa düzeni",{exact:true})).toHaveValue(id);
    await expect(dialog.getByLabel("Kurgu Deniz Çınar",{exact:true})).toBeChecked();
    await expect(dialog.getByLabel("Kurgu İpek Yıldız",{exact:true})).toBeChecked();
    await dialog.locator(".pdf-preview-options > summary").click();
    const download=page.waitForEvent("download");
    await dialog.getByRole("button",{name:"Bu PDF'yi indir",exact:true}).click();
    await (await download).saveAs(`${output}/${id}.pdf`);
    const pdf=await PDFDocument.load(await readFile(`${output}/${id}.pdf`));
    if (id === "single-page-roster") expect(pdf.getPageCount()).toBe(1);
    expect(pdf.getPages().every(p=>landscape?p.getWidth()>p.getHeight():p.getHeight()>p.getWidth())).toBe(true);
    await dialog.locator(".pdf-preview-secondary-actions > summary").click();
    const excel=page.waitForEvent("download");
    await dialog.getByRole("button",{name:"Excel'e çıkar",exact:true}).click();
    await (await excel).saveAs(`${output}/${id}.xlsx`);
    const workbook=XLSX.read(await readFile(`${output}/${id}.xlsx`),{type:"buffer"});
    expect(workbook.SheetNames.length).toBeGreaterThanOrEqual(2);
    const texts=workbook.SheetNames.map(name=>XLSX.utils.sheet_to_csv(workbook.Sheets[name]!)).join("\n");
    expect(texts).toContain("Kurgu Deniz Çınar"); expect(texts).toContain("Kurgu İpek Yıldız");
    await page.screenshot({path:`${output}/${id}-preview.png`});
    await dialog.getByRole("button",{name:"PDF önizlemesini kapat",exact:true}).click();
    await expect(dialog).toHaveCount(0);
  }
  await page.getByRole("button",{name:"Belgeler",exact:true}).click();
  const documentChoices=page.getByRole("region",{name:"Sınıf listesi hazır düzenleri",exact:true});
  await documentChoices.getByRole("button",{name:/^Sınıfta kullan/}).click();
  const documentPreview=page.getByRole("dialog",{name:"PDF önizlemesi",exact:true});
  await expect(documentPreview.locator("canvas[data-pdf-rendered=true]")).toBeVisible({timeout:30000});
  await expect(documentPreview.getByRole("document",{name:/PDF sayfa 1 seçilebilir metni/})).toContainText("Günlük sınıf çizelgesi");
  if(production) expect(await page.evaluate(()=>navigator.onLine)).toBe(false);
});
