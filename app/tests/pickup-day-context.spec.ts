import { test, expect } from "@playwright/test";
test("seçilen teslim günü korunur; geçmişten bugüne açık eylem gerçek UTC ve civil_date kaydeder",async({page,context})=>{
 await page.clock.setFixedTime(new Date("2026-09-12T09:00:00.000Z"));
 await page.goto("/tests/pickup-day-context-fixture.html");
 const person=page.getByLabel("Teslim alan kişi",{exact:true});
 await expect(person).toBeDisabled();
 await expect(page.getByRole("group",{name:"11.09.2026 teslimi"})).toBeVisible();
 await page.getByRole("button",{name:"Bugünün teslimini aç",exact:true}).click();
 await expect(person).toBeEnabled();await person.selectOption({label:"Kurgu Yetkili · Anne"});
 await page.getByLabel("Gerçek teslim saati",{exact:true}).fill("11:55");
 await context.setOffline(true);
 await page.getByRole("button",{name:"Teslimi kaydet",exact:true}).click();
 await expect(page.getByText("Seçilen günün teslimi kaydedildi.",{exact:false})).toBeVisible();
 const logs=await page.evaluate(async()=>{const snapshot=await (window as any).pickupContextTest.store.readSnapshot();return snapshot.settings.filter((r:any)=>r.workflow?.kind==="pickup-log");});
 expect(logs).toHaveLength(1);expect(logs[0].civilDate).toBe("2026-09-12");expect(logs[0].workflow.handedOverAt).toBe("2026-09-12T08:55:00.000Z");
});
