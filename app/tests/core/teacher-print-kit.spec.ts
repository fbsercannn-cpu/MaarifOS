import {expect,test} from "@playwright/test";
import {mkdir,writeFile} from "node:fs/promises";
test("20 ve 30 çocukluk yatay A4 teslim çizelgesi kaynakları kesmeden okunur imza satırları üretir",async({page})=>{
  await page.goto("/tests/runtime-fixture.html");const files=await page.evaluate(async()=>{
    const core=await import("/src/core/index.ts"),fx=await import("/tests/fixtures/teacher-print-kit-fixture.mjs"),docs=await import("/src/features/teacher-print-kit/print-kit-document.ts");const store=new core.IndexedDbDataStore({databaseName:`density-${crypto.randomUUID()}`}),f=await fx.makeTeacherPrintKitFixture(store);
    const files=[];for(const count of [20,30]){const model={...f.pickup,rows:Array.from({length:count},(_,i)=>({...f.pickup.rows[0],studentId:crypto.randomUUID(),studentName:`Kurgu Çocuk ${String(i+1).padStart(2,"0")}`,contacts:[{id:crypto.randomUUID(),name:`Kurgu Yetkili ${i+1}`,relationship:"Yakını",phone:"+905000000002"}],deliveries:[],correctionCount:0}))};const bytes=await docs.createPickupSheetPdf(model);const nodes=docs.pickupSheetNodes(model,model.rows.map(r=>r.studentId),["roster","phones","actual"]);files.push({count,bytes:Array.from(bytes),rows:nodes.find(n=>n.kind==="table")!.rows.length});}store.close();return files;
  });await mkdir("output/teacher-print-kit-qa",{recursive:true});for(const file of files){expect(file.rows).toBe(file.count);expect(new TextDecoder().decode(Uint8Array.from(file.bytes)).match(/\/Type \/Page\b/gu)?.length).toBeLessThanOrEqual(3);await writeFile(`output/teacher-print-kit-qa/teslim-${file.count}.pdf`,Buffer.from(file.bytes));}
});
test("Teslim yetkisi, gerçek saat ve düzeltme kaynakları; klasör seçimleri ve belge geçmişi korunur",async({page})=>{
  await page.goto("/tests/runtime-fixture.html");const result=await page.evaluate(async()=>{
    const core=await import("/src/core/index.ts"),fx=await import("/tests/fixtures/teacher-print-kit-fixture.mjs"),docs=await import("/src/features/teacher-print-kit/print-kit-document.ts"),models=await import("/src/features/teacher-print-kit/print-kit-model.ts"),follow=await import("/src/features/teacher-followup/teacher-followup-service.ts"),history=await import("/src/features/documents/document-history-service.ts");
    const store=new core.IndexedDbDataStore({databaseName:`print-kit-${crypto.randomUUID()}`}),f=await fx.makeTeacherPrintKitFixture(store),recipe=await docs.createPickupSheetRecipe(store,f.day),binder=await docs.createBinderKitRecipe(store,"2026-09",[`saved:${f.saved.id}`]);
    const pdf=await recipe.build(recipe.initial),binderPdf=await binder.build(binder.initial);
    await history.saveDocumentVersion({store,scope:f.scope},{file:binderPdf,title:binder.title,selection:binder.initial,now:f.now});
    await recipe.assertExportAllowed(recipe.initial);await binder.assertExportAllowed(binder.initial);
    const zip=await binder.exportActions[0].build(binder.initial);
    const narrowed={...recipe.initial,studentIds:[f.otherStudentId],fields:["roster"]};const refreshed=await recipe.refresh(narrowed);const narrow=docs.pickupSheetNodes(await models.loadPickupSheet(store,f.day),narrowed.studentIds,narrowed.fields);
    let foreign=false;try{await docs.createBinderKitRecipe(store,"2026-09",["saved:unknown"]);}catch{foreign=true;}
    await follow.appendTeacherFollowup(store,{studentId:f.studentId,now:new Date("2026-09-21T12:01:00.000Z"),workflow:{kind:"pickup-correction",sourceId:f.delivery.id,note:"Kurgu yanlış saat kaydını düzeltiyorum."}});
    let stale=false;try{await recipe.assertExportAllowed(recipe.initial);}catch{stale=true;}
    const corrected=await models.loadPickupSheet(store,f.day);
    const result={contacts:f.pickup.rows[0].contacts.map(c=>c.name),actual:f.pickup.rows[0].deliveries[0].handedOverAt,secondNoAuthority:f.pickup.rows[1].contacts.length,foreign,stale,corrected:corrected.rows[0].deliveries.length,correctionCount:corrected.rows[0].correctionCount,narrowText:JSON.stringify(narrow),refreshStudents:refreshed.students.length,pdf:Array.from(pdf.bytes),binderPdf:Array.from(binderPdf.bytes),zip:Array.from(zip.bytes)};store.close();return result;
  });expect(result.contacts).toEqual(["Kurgu Yetkili Yakın"]);expect(result.actual).toBe("2026-09-21T11:30:00.000Z");expect(result.secondNoAuthority).toBe(0);expect(result.foreign).toBe(true);expect(result.stale).toBe(true);expect(result.corrected).toBe(0);expect(result.correctionCount).toBe(1);expect(result.narrowText).not.toContain("05000000002");expect(result.narrowText).not.toContain("Kurgu Çocuk 1");expect(result.zip.slice(0,2)).toEqual([80,75]);
  await mkdir("output/teacher-print-kit-qa",{recursive:true});await writeFile("output/teacher-print-kit-qa/teslim.pdf",Buffer.from(result.pdf));await writeFile("output/teacher-print-kit-qa/klasor.pdf",Buffer.from(result.binderPdf));await writeFile("output/teacher-print-kit-qa/klasor.zip",Buffer.from(result.zip));
});
