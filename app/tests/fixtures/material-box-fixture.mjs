import { seedSmallGroupCardsFixture } from "./small-group-cards-fixture.mjs";
import { appendClassroomAdmin } from "../../src/features/classroom-admin/classroom-admin-service.ts";
import { saveLearningCenter } from "../../src/features/learning-centers/learning-center-service.ts";
import { adminLedgerHead,classroomAdminRecords } from "../../src/core/domain/classroom-admin.ts";
import { learningCenterHead } from "../../src/core/domain/learning-centers.ts";
import { loadMaterialBoxModel } from "../../src/features/material-box-labels/material-box-service.ts";
export async function makeMaterialBoxFixture(store,{count=12}={}){
  const f=await seedSmallGroupCardsFixture(store,{planCount:1}),scope={academicYearId:f.input.academicYearId,classroomId:f.input.classroomId},now=new Date("2026-09-14T09:00:00.000Z"),day="2026-09-14";
  const names=[f.sourceActivity.materials[0],"Kurgu renkli tahta parçaları"],items=[];
  for(const name of names){const data=await store.readSnapshot();items.push(await appendClassroomAdmin(store,{expectedScope:scope,expectedHead:adminLedgerHead(classroomAdminRecords(data,scope)),now,workflow:{kind:"inventory-item",name,category:"Kurgu merkez malzemesi",unit:"set",initialQuantity:30,note:""}}));}
  const data=await store.readSnapshot(),plan=await saveLearningCenter(store,{expectedScope:scope,expectedHead:learningCenterHead(data,scope),expectedInventoryHead:adminLedgerHead(classroomAdminRecords(data,scope)),now,command:{kind:"plan",title:"Kurgu haftalık merkez düzeni",startOn:day,endOn:"2026-09-18",previousPlanId:null,centers:Array.from({length:count},(_,i)=>({id:crypto.randomUUID(),name:`Kurgu merkez ${String(i+1).padStart(2,"0")}`,observation:"",nextStep:"",allocations:items.map(item=>({itemId:item.id,quantity:1}))}))}});
  return{...f,scope,now,day,centerPlan:plan,items,model:await loadMaterialBoxModel(store,day)};
}
