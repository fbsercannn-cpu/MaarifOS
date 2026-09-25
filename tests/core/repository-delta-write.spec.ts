import {test,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
test('one-record update preserves encrypted siblings and records physical write count',async({page})=>{
 await page.route('**/@vite/client',route=>route.fulfill({contentType:'application/javascript',body:'export {};'}));
 await page.goto('/tests/repository-performance-fixture.html');
 const result=await page.evaluate(async()=>{
  const {IndexedDbDataStore}=await import('/src/core/repository/indexed-db.ts');
  const {makeDevelopmentReportFixture}=await import('/tests/fixtures/development-report-fixture.mjs');
  const name=`delta-fixture-${crypto.randomUUID()}`;const store=new IndexedDbDataStore({databaseName:name});
  const f=await makeDevelopmentReportFixture(store);const snapshot=await store.readSnapshot();const template=snapshot.observations[0];
  const rows=Array.from({length:100},(_,index)=>({...template,id:`20000000-0000-4000-8000-${String(index+1).padStart(12,'0')}`}));
  await store.transaction('readwrite',['observations'],async tx=>{await tx.clear('observations');await tx.putMany('observations',rows);});
  const originalPut=IDBObjectStore.prototype.put,originalClear=IDBObjectStore.prototype.clear;
  let puts=0,clears=0,revision=0;const timings=[];
  IDBObjectStore.prototype.put=function(...args){if(this.name==='observations'&&this.transaction.db.name===name)puts++;return originalPut.apply(this,args);};
  IDBObjectStore.prototype.clear=function(...args){if(this.name==='observations'&&this.transaction.db.name===name)clears++;return originalClear.apply(this,args);};
  try{
   for(let i=0;i<21;i++){const start=performance.now();await store.transaction('readwrite',['observations'],tx=>tx.putMany('observations',[{...rows[0],rawText:`Kurgu delta ${++revision}`} ]));if(i>0)timings.push(performance.now()-start);else{puts=0;clears=0;}}
  }finally{IDBObjectStore.prototype.put=originalPut;IDBObjectStore.prototype.clear=originalClear;}
  const after=await store.readSnapshot();store.close();const sorted=[...timings].sort((a,b)=>a-b);
  return {records:100,measuredUpdates:20,puts,clears,p50Ms:sorted[9],p95Ms:sorted[18],samplesMs:timings,siblingsPreserved:after.observations.filter(o=>o.id!==rows[0].id).every(o=>o.rawText===template.rawText),lastValue:after.observations.find(o=>o.id===rows[0].id)?.rawText};
 });
 const baseline=process.env.MAARIFOS_DELTA_BASELINE==='1';
 expect(result.puts).toBe(baseline?2000:20);expect(result.clears).toBe(baseline?20:0);expect(result.siblingsPreserved).toBe(true);expect(result.lastValue).toBe('Kurgu delta 21');
 const directory=resolve('../../artifacts/implementation-2026-09-19');await mkdir(directory,{recursive:true});await writeFile(resolve(directory,baseline?'repository-delta-before.json':'repository-delta-after.json'),JSON.stringify({measuredAt:new Date().toISOString(),synthetic:true,baseline,...result},null,2));
 console.log('DELTA_WRITE_MEASUREMENT',JSON.stringify({baseline,puts:result.puts,clears:result.clears,p50Ms:result.p50Ms,p95Ms:result.p95Ms}));
});

test('delta native abort preserves preimage; explicit clear and ID changes retain full-write semantics',async({page})=>{
 await page.goto('/tests/repository-performance-fixture.html');
 const result=await page.evaluate(async()=>{
  const {IndexedDbDataStore}=await import('/src/core/repository/indexed-db.ts');
  const {canonicalJson}=await import('/src/core/backup/canonical-json.ts');
  const {makeDevelopmentReportFixture}=await import('/tests/fixtures/development-report-fixture.mjs');
  const {readAll}=await import('/tests/fixtures/local-vault-browser.ts');
  const name=`delta-atomic-${crypto.randomUUID()}`;const store=new IndexedDbDataStore({databaseName:name});await makeDevelopmentReportFixture(store);
  const snapshot=await store.readSnapshot(),template=snapshot.observations[0];
  const rows=Array.from({length:3},(_,i)=>({...template,id:`30000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`}));
  await store.transaction('readwrite',['observations'],async tx=>{await tx.clear('observations');await tx.putMany('observations',rows);});
  const before=canonicalJson(await store.readSnapshot()),originalPut=IDBObjectStore.prototype.put,originalClear=IDBObjectStore.prototype.clear;let failed=false;
  try{
   IDBObjectStore.prototype.put=function(...args){const request=originalPut.apply(this,args);if(this.transaction.db.name===name&&this.name==='observations'){const transaction=this.transaction;request.addEventListener('success',()=>transaction.abort(),{once:true});}return request;};
   await store.transaction('readwrite',['observations'],tx=>tx.putMany('observations',[{...rows[0],rawText:'Should abort'}]));
  }catch{failed=true;}finally{IDBObjectStore.prototype.put=originalPut;}
  const exact=before===canonicalJson(await store.readSnapshot());
  const counts=[];let puts=0,clears=0;
  IDBObjectStore.prototype.put=function(...args){if(this.transaction.db.name===name&&this.name==='observations')puts++;return originalPut.apply(this,args);};
  IDBObjectStore.prototype.clear=function(...args){if(this.transaction.db.name===name&&this.name==='observations')clears++;return originalClear.apply(this,args);};
  try{
   await store.transaction('readwrite',['observations'],async tx=>{await tx.clear('observations');await tx.putMany('observations',rows.map(row=>({...row,rawText:'Explicit replacement'})));});counts.push({puts,clears});puts=0;clears=0;
   await store.transaction('readwrite',['observations'],tx=>tx.putMany('observations',[{...rows[0],id:crypto.randomUUID()}]));counts.push({puts,clears});
  }finally{IDBObjectStore.prototype.put=originalPut;IDBObjectStore.prototype.clear=originalClear;}
  const second=new IndexedDbDataStore({databaseName:name});await Promise.all([store.transaction('readwrite',['observations'],tx=>tx.putMany('observations',[{...rows[0],rawText:'First writer'}])),second.transaction('readwrite',['observations'],tx=>tx.putMany('observations',[{...rows[1],rawText:'Second writer'}]))]);
  const after=await store.readSnapshot();store.close();second.close();const raw=JSON.stringify(await readAll(name,'observations'));
  return {failed,exact,counts,first:after.observations.some(row=>row.rawText==='First writer'),second:after.observations.some(row=>row.rawText==='Second writer'),encrypted:!raw.includes('First writer')&&!raw.includes('Second writer')};
 });
 expect(result).toEqual({failed:true,exact:true,counts:[{puts:3,clears:1},{puts:4,clears:1}],first:true,second:true,encrypted:true});
});
