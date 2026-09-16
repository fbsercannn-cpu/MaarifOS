import {expect,test} from "@playwright/test";
test("320px teslim çizelgesi ve seçili belgelerden klasör seti çevrimdışı indirilir",async({page,context})=>{
  await page.setViewportSize({width:320,height:1000});await page.clock.install({time:new Date("2026-09-21T12:00:00.000Z")});await page.goto("/tests/runtime-fixture.html");await page.evaluate(async()=>{const fx=await import("/tests/fixtures/teacher-print-kit-mount.tsx");Object.assign(window,{kitMounted:await fx.mountTeacherPrintKit()});});
  await page.getByText("2 çocuk · Gerçek teslim kaydına geç",{exact:true}).click();await page.getByRole("button",{name:"Teslim kaydını aç",exact:true}).click();expect(await page.evaluate(()=>(window as any).kitMounted.opened)).toHaveLength(1);
  await page.getByRole("button",{name:"Günlük teslim çizelgesini hazırla",exact:true}).click();await expect(page.getByRole("document",{name:/PDF sayfa 1 seçilebilir metni/u}).first()).toBeVisible();
  await page.getByRole("button",{name:"PDF önizlemesini kapat"}).click();
  await page.getByRole("button",{name:"1 belgeyle klasör setini hazırla",exact:true}).click();await expect(page.getByRole("button",{name:"Bu PDF'yi indir",exact:true})).toBeEnabled();
  await expect(page.getByRole("document",{name:/PDF sayfa 1 seçilebilir metni/u})).toBeVisible();await context.setOffline(true);
  const download=page.waitForEvent("download");await page.getByRole("button",{name:"Bu PDF'yi indir",exact:true}).click();expect((await download).suggestedFilename()).toBe("Klasor_Seti_2026-09.pdf");
  await page.getByText("Diğer işlemler",{exact:true}).click();const packageDownload=page.waitForEvent("download");await page.getByRole("button",{name:"Klasör setini seçilen belgelerle indir",exact:true}).click();expect((await packageDownload).suggestedFilename()).toBe("Klasor_ve_Belgeler_2026-09.zip");await expect(page.getByRole("alert")).toHaveCount(0);
  await page.getByRole("button",{name:"PDF önizlemesini kapat"}).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth>320)).toBe(false);
});
