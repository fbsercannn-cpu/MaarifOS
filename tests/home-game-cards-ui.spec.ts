import {test,expect} from "@playwright/test";
test.use({viewport:{width:320,height:844}});
test("two named cards, actual feedback, reload, offline write, backup restore and isolated permanent deletion",async({page,context})=>{
 test.setTimeout(90000);await page.clock.setFixedTime(new Date("2026-09-12T09:00:00Z"));await page.goto("/tests/home-game-fixture.html");
 const panel=page.getByRole("region",{name:"Aileye ev oyunu kartı",exact:true});await panel.getByRole("checkbox").nth(0).check();await panel.getByRole("checkbox").nth(1).check();
 await panel.getByLabel("Kaynak etkinlik",{exact:true}).selectOption({label:"2026-09-10 · Evde hikâye sıralama"});await panel.getByLabel("Malzemeler",{exact:true}).fill("Üç resimli kart.");await panel.getByLabel("Evde oyun adımları",{exact:true}).fill("Resimleri sıraya koyun ve çocuğunuzun hikâyesini dinleyin.");
 await panel.getByRole("button",{name:"Kartları kaydet ve PDF'yi aç",exact:true}).click();const dialog=page.getByRole("dialog",{name:"PDF önizlemesi",exact:true});await expect(dialog.getByRole("button",{name:"Bu PDF'yi indir",exact:true})).toBeEnabled();
 for(let i=0;i<2;i++){const download=page.waitForEvent("download");await dialog.getByRole("button",{name:"Bu PDF'yi indir",exact:true}).click();await download;await expect(dialog.getByRole("button",{name:"Bu PDF'yi indir",exact:true})).toBeEnabled();}
 await page.evaluate(async()=>{const api=(window as any).homeGameTest;const snapshot=await api.store.readSnapshot();const child=snapshot.students[0];await api.store.transaction("readwrite",["students"],async tx=>tx.putMany("students",[{...child,displayName:"Kurgu Güncellenen Çocuk"}]));api.bump();});await expect(dialog.getByRole("button",{name:"Bu PDF'yi indir",exact:true})).toBeDisabled();await expect(dialog.getByText("Belgenin kaynak kayıtları değişti. Eski dosyanın indirilmesi durduruldu.",{exact:true})).toBeVisible();
 await page.keyboard.press("Escape");await expect(dialog).toBeHidden();
 await panel.getByLabel("Ailenin gerçek geri bildirimi",{exact:true}).fill("Üç resmi sıraya koydu ve kendi hikâyesini anlattı.");
 await context.setOffline(true);await panel.getByRole("button",{name:"Gelen aile yanıtını kaydet",exact:true}).click();await expect(panel.getByRole("blockquote")).toContainText("Üç resmi");await context.setOffline(false);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.reload();await panel.getByLabel("Kayıtlı kart",{exact:true}).selectOption({index:1});await expect(panel.getByRole("blockquote")).toContainText("Üç resmi");
 const result=await page.evaluate(async()=>{
  const {store}=(window as any).homeGameTest;const {BackupService}=await import("/src/core/backup/backup-service.ts");const {IndexedDbDataStore}=await import("/src/core/repository/indexed-db.ts");const {homeGameCards}=await import("/src/features/home-game-cards/home-game-card-model.ts");const {previewPermanentStudentDeletion,permanentlyDeleteStudent}=await import("/src/features/students/student-lifecycle.ts");
  const now=new Date("2026-09-12T10:00:00Z"), backup=await new BackupService(store,{appVersion:"0.42.0",clock:()=>now}).exportBackup();const restored=new IndexedDbDataStore({databaseName:`home-game-restore-${crypto.randomUUID()}`});await new BackupService(restored,{appVersion:"0.42.0",clock:()=>now}).restoreBackup(backup,{mode:"replace",createRecoverySnapshot:false});const before=homeGameCards(await restored.readSnapshot());const child=before.find(r=>r.workflow.kind==="feedback")!.studentId;const impact=previewPermanentStudentDeletion(await restored.readSnapshot(),child);await permanentlyDeleteStudent(restored,{studentId:child,confirmationName:impact.displayName,expectedFingerprint:impact.fingerprint,now});return {before:before.length,after:homeGameCards(await restored.readSnapshot()).length,remainingOther:homeGameCards(await restored.readSnapshot()).every(r=>r.studentId!==child)};
 });expect(result).toEqual({before:3,after:1,remainingOther:true});
});



