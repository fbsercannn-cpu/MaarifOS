import{createElement}from"react";import{createRoot}from"react-dom/client";
import{IndexedDbDataStore}from"../../src/core/index.ts";
import{MobileDeviceProvider,KeyboardProvider}from"../../src/mobile";
import{PlanNextSteps}from"../../src/features/planning/PlanNextSteps.tsx";
import{makeDailyPlanLinkFixture}from"./daily-plan-link-fixture.mjs";
export async function mountDailyPlanLink(){const store=new IndexedDbDataStore({databaseName:`link-ui-${crypto.randomUUID()}`}),f=await makeDailyPlanLinkFixture(store);const host=document.createElement("main");host.style.width="320px";host.style.maxWidth="100%";document.body.style.margin="0";document.body.replaceChildren(host);const root=createRoot(host),opened:unknown[]=[];
root.render(createElement(MobileDeviceProvider,{},createElement(KeyboardProvider,{native:true},createElement(PlanNextSteps,{store,civilDate:f.day,onOpenPlan:target=>{opened.push(target);}}))));return{...f,store,opened};}
