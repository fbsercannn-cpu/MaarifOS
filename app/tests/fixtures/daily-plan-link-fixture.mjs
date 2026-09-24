import {makePreparedTeacherFixture} from "./prepared-teacher-actions-fixture.mjs";
import {loadPlanNextSteps,applyPlanNextStep} from "../../src/features/planning/plan-next-steps.ts";
export async function makeDailyPlanLinkFixture(store){
  const f=await makePreparedTeacherFixture(store),now=new Date("2026-09-21T07:00:00.000Z"),day="2026-09-21";
  const before=await loadPlanNextSteps(f.store,{civilDate:day});await applyPlanNextStep(f.store,before.options[0].request,{now});
  const model=await loadPlanNextSteps(f.store,{civilDate:day});
  return{...f,now:new Date("2026-09-22T07:00:00.000Z"),day,model,request:model.options[0].request};
}
