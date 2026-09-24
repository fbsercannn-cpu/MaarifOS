import {rolldown} from 'rolldown';
import {resolve} from 'node:path';
import type {Page} from '@playwright/test';

// Test-only bridge, never emitted into dist. Uses the real encryption/transaction
// implementation instead of assuming physical IndexedDB rows contain plaintext.
let bundle: Promise<string> | undefined;
export async function installRepositoryBridge(page:Page){
 if(await page.evaluate(()=>!!(window as any).__testRepository))return;
 bundle??=rolldown({input:resolve(process.cwd(),'src/core/repository/indexed-db.ts'),platform:'browser',transform:{define:{'import.meta.env':'{}'}}}).then(async bundler=>{try{const result=await bundler.generate({format:'iife',name:'__testRepository'});return result.output[0].code;}finally{await bundler.close();}});
 await page.addScriptTag({content:await bundle});
}
export async function readRepositorySnapshot(page:Page){
 await installRepositoryBridge(page);
 return page.evaluate(async()=>{const store=new (window as any).__testRepository.IndexedDbDataStore();try{return await store.readSnapshot();}finally{store.close();}});
}
export async function changeRepositorySource(page:Page,collection:'observations'|'evidenceCurriculumLinks',change:{suffix?:string;referenceTitle?:string}){
 await installRepositoryBridge(page);
 await page.evaluate(async({collection,change})=>{const store=new (window as any).__testRepository.IndexedDbDataStore();try{await store.transaction('readwrite',[collection],async(tx:any)=>{const rows=await tx.getAll(collection),current=rows.find((row:any)=>!row.deletedAt);if(!current)throw new Error('Kurgu kaynak bulunamadı.');await tx.putMany(collection,[{...current,...(change.suffix!==undefined?{rawText:current.rawText+change.suffix}:{referenceTitle:change.referenceTitle}),updatedAt:new Date().toISOString()}]);});}finally{store.close();}},{collection,change});
}


