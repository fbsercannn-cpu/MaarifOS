import { expect,test } from "@playwright/test";
test("320px görüşme formu gerçek not ve seçilen iki görevi tek tıklamayla kaydeder",async({page})=>{
  await page.setViewportSize({width:320,height:1000});await page.clock.install({time:new Date("2026-09-22T12:00:00.000Z")});await page.goto("/tests/runtime-fixture.html");await page.evaluate(async()=>{const fx=await import("/tests/fixtures/family-meeting-form-mount.tsx");Object.assign(window,{meetingMounted:await fx.mountFamilyMeetingForm()});});
  const save=page.getByRole("button",{name:"Görüşmeyi görevleri ve takibi birlikte kaydet"});await expect(save).toBeDisabled();
  await page.getByLabel("Gerçekte görüşülenler",{exact:true}).fill("Kurgu veli evdeki yapı oyununu anlattı; gerçek sınıf gözlemi birlikte incelendi.");await page.getByLabel("Birlikte alınan karar",{exact:true}).fill("Aile ve öğretmen bir sonraki hafta gözlemleri karşılaştırmayı kararlaştırdı.");await page.getByLabel("Ortak takip tarihi",{exact:true}).fill("2026-09-29");
  await page.getByRole("button",{name:"Ailenin gözlemlerini paylaşma görevini ekle"}).click();await page.getByRole("button",{name:"Öğretmenin destek takibi görevini ekle"}).click();
  await save.click();
  await expect(page.getByText("Görüşme sonucu, görevler ve takip tarihi birlikte kaydedildi.",{exact:true})).toBeVisible();await expect(page.getByRole("button",{name:"Kaydedilen formu PDF veya Word hazırla"})).toBeVisible();
  const answer=await page.evaluate(async()=>{const data=await(window as any).meetingMounted.store.readSnapshot();return{tasks:data.settings.filter((r:any)=>r.workflow?.kind==="family-meeting-task").length,meeting:data.settings.filter((r:any)=>r.workflow?.kind==="family-meeting").length,overflow:document.documentElement.scrollWidth>320};});expect(answer).toEqual({tasks:2,meeting:1,overflow:false});
  await page.getByRole("button",{name:"Aile görevini tamamlandı olarak kaydet"}).click();await expect(page.getByText("Görevin tamamlandığı kaydedildi.",{exact:true})).toBeVisible();
});
test("Belge hazırlanırken kilitlenen panel eski kapsamın önizlemesini yayınlamaz",async({page})=>{
  await page.clock.install({time:new Date("2026-09-22T12:00:00.000Z")});await page.goto("/tests/runtime-fixture.html");await page.evaluate(async()=>{const fx=await import("/tests/fixtures/family-meeting-form-mount.tsx");Object.assign(window,{meetingMounted:await fx.mountFamilyMeetingForm()});});
  const output=page.getByRole("button",{name:"Görüşme öncesi formu PDF veya Word hazırla"});await expect(output).toBeEnabled();await page.evaluate(()=>(window as any).meetingMounted.holdNextRead());await output.click();await expect(output).toBeDisabled();
  await page.evaluate(()=>{(window as any).meetingMounted.setDisabled(true);});await page.evaluate(()=>(window as any).meetingMounted.releaseRead());await expect(output).toBeDisabled();expect(await page.evaluate(()=>(window as any).meetingMounted.previews.length)).toBe(0);
});

for (const format of ["pdf", "word"] as const) test(`Gerçek belge geçmişi ${format} indirmesini bozmaz; görüşme sonucu değişince eski çıktı durur`,async({page})=>{
  await page.setViewportSize({width:1000,height:1000});
  await page.clock.install({time:new Date("2026-09-22T12:00:00.000Z")});
  await page.goto("/tests/runtime-fixture.html");
  await page.evaluate(async()=>{const fx=await import("/tests/fixtures/family-meeting-form-mount.tsx");Object.assign(window,{meetingMounted:await fx.mountFamilyMeetingForm({realPreview:true})});});
  await page.getByRole("button",{name:"Görüşme öncesi formu PDF veya Word hazırla"}).click();
  const action=page.getByRole("button",{name:format==="pdf" ? "Bu PDF'yi indir" : "Düzenlenebilir Word formunu indir",exact:true});
  await expect(action).toBeEnabled();
  const download=page.waitForEvent("download");await action.click();
  expect((await download).suggestedFilename()).toMatch(format==="pdf" ? /\.pdf$/u : /\.docx$/u);
  expect(await page.evaluate(async()=>{const data=await(window as any).meetingMounted.store.readSnapshot();return data.settings.filter((r:any)=>r.settingType==="document-version").length;})).toBe(1);
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.evaluate(async()=>{
    const mounted=(window as any).meetingMounted;
    const service=await import("/src/features/family-engagement/family-meeting-form-service.ts");
    const current=await service.loadFamilyMeetingForm(mounted.store,mounted.appointmentId,mounted.now);
    await service.saveFamilyMeetingForm(mounted.store,{...mounted.input,expectedFingerprint:current.fingerprint});
  });
  const laterDownloads:string[]=[];page.on("download",d=>laterDownloads.push(d.suggestedFilename()));
  await action.click();
  await expect(page.getByRole("alert")).toContainText("Görüşme kaydı değişti");
  expect(laterDownloads).toEqual([]);
  expect(await page.evaluate(async()=>{const data=await(window as any).meetingMounted.store.readSnapshot();return data.settings.filter((r:any)=>r.settingType==="document-version").length;})).toBe(1);
});

