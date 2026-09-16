import{test,expect}from"@playwright/test";
test("320px hazır ilişki seçimi gerçek mevcut günlük planı haftaya bağlar ve aynı kaydı açar",async({page})=>{
await page.setViewportSize({width:320,height:950});await page.clock.install({time:new Date("2026-09-21T08:00:00.000Z")});await page.goto("/tests/runtime-fixture.html");await page.evaluate(async()=>{const fx=await import("/tests/fixtures/daily-plan-link-mount.tsx");Object.assign(window,{dailyMounted:await fx.mountDailyPlanLink()});});
await page.getByRole("button",{name:"Günlük planı bu haftaya bağla",exact:true}).click();await expect(page.getByText("Günlük plan ve mevcut etkinlikleri seçilen haftaya bağlandı.",{exact:true})).toBeVisible();await page.getByRole("button",{name:"Kayıtlı günlük planı aç",exact:true}).click();
const result=await page.evaluate(async()=>{const f=(window as any).dailyMounted,s=await f.store.readSnapshot();return{opened:f.opened[0]?.planId===f.request.dailyPlanId,linked:s.plans.find((p:any)=>p.id===f.request.dailyPlanId)?.sourceWeeklyPlanId===f.request.weeklyPlanId,overflow:document.documentElement.scrollWidth>320};});expect(result).toEqual({opened:true,linked:true,overflow:false});
});
