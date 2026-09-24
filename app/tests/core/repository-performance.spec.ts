import {test,expect} from '@playwright/test';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';

test('synthetic 1/3/5-year encrypted IndexedDB workload records reproducible p50/p95',async({page,browserName})=>{
 test.skip(process.env.MAARIFOS_RUN_BENCHMARK!=='1','Yoğun sentetik ölçüm yalnız açık benchmark komutunda çalışır.');
 test.setTimeout(900_000);
 const sampleCount=Number(process.env.MAARIFOS_BENCHMARK_SAMPLES??20);
 if(!Number.isInteger(sampleCount)||sampleCount<5||sampleCount>100)throw new Error('Benchmark sample count must be 5..100');
 const directory=resolve('../../artifacts/implementation-2026-09-19');await mkdir(directory,{recursive:true});
 const checkpoints:unknown[]=[];
 await page.exposeFunction('__saveRepositoryMeasurement',async(value:unknown)=>{checkpoints.push(value);await writeFile(resolve(directory,'repository-performance-progress.json'),JSON.stringify({complete:false,sampleCount,checkpoints},null,2));console.log('BENCHMARK_CHECKPOINT',JSON.stringify(value));});
 const sourcePath=resolve('src/core/repository/indexed-db.ts');
 const sourceHash=()=>readFile(sourcePath).then(bytes=>createHash('sha256').update(bytes).digest('hex'));
 const hashBefore=await sourceHash();
 await page.route('**/@vite/client',route=>route.fulfill({contentType:'application/javascript',body:'export {};'}));
 await page.goto('/tests/repository-performance-fixture.html');
 const result=await page.evaluate(async(sampleCount)=>{
  const {IndexedDbDataStore}=await import('/src/core/repository/indexed-db.ts');
  const {COLLECTION_NAMES}=await import('/src/core/domain/model.ts');
  const {repositoryPerformanceFixture,PERFORMANCE_DATASET_VERSION}=await import('/tests/fixtures/repository-performance-fixture.mjs');
  const results=[];
  const measure=async(task:()=>Promise<unknown>)=>{
   for(let i=0;i<1;i++)await task();
   const samples=[];for(let i=0;i<sampleCount;i++){const start=performance.now();await task();samples.push(performance.now()-start);}
   const sorted=[...samples].sort((a,b)=>a-b);return {sampleCount:samples.length,warmups:1,p50Ms:sorted[Math.ceil(sorted.length*.5)-1],p95Ms:sorted[Math.ceil(sorted.length*.95)-1],minMs:sorted[0],maxMs:sorted.at(-1),samplesMs:samples};
  };
  for(const years of [1,3,5]){
   const data=await repositoryPerformanceFixture(years);
   const databaseName=`maarifos-synthetic-performance-${crypto.randomUUID()}`;
   const store=new IndexedDbDataStore({databaseName});
   try{
    const seedStart=performance.now();
    await store.transaction('readwrite',COLLECTION_NAMES,async tx=>{for(const name of COLLECTION_NAMES)if(data.snapshot[name].length)await tx.putMany(name,data.snapshot[name]);});
    const seedMs=performance.now()-seedStart;await window.__saveRepositoryMeasurement({years,operation:'seed',seedMs});
    const observationRead=await measure(async()=>{const rows=await store.listObservationsByStudent(data.studentId);if(rows.length!==40)throw new Error('Synthetic observation count mismatch');});
    await window.__saveRepositoryMeasurement({years,operation:'observationRead',...observationRead});
    const attendanceRead=await measure(async()=>{const rows=await store.listAttendanceByClassroomDate(data.classroomId,data.civilDate);if(rows.length!==30)throw new Error('Synthetic attendance count mismatch');});
    await window.__saveRepositoryMeasurement({years,operation:'attendanceRead',...attendanceRead});
    const snapshotRead=await measure(async()=>{const snapshot=await store.readSnapshot();if(snapshot.students.length!==30*years||snapshot.observations.length!==1200*years||snapshot.attendanceRecords.length!==5400*years)throw new Error('Synthetic snapshot mismatch');});
    await window.__saveRepositoryMeasurement({years,operation:'snapshotRead',...snapshotRead});
    let revision=0;const record=data.snapshot.observations[0];
    const singleObservationWrite=await measure(async()=>{await store.transaction('readwrite',['observations'],tx=>tx.putMany('observations',[{...record,rawText:`Yalnız kurgu performans güncellemesi ${++revision}`}]))});
    await window.__saveRepositoryMeasurement({years,operation:'singleObservationWrite',...singleObservationWrite});
    const final=await store.listObservationsByStudent(data.studentId);if(final.length!==40||!final.some(row=>row.rawText===`Yalnız kurgu performans güncellemesi ${revision}`))throw new Error('Committed write not readable');
    results.push({years,counts:{students:30*years,observations:1200*years,attendance:5400*years},plaintextSnapshotBytes:new TextEncoder().encode(JSON.stringify(data.snapshot)).length,seedMs,observationRead,attendanceRead,snapshotRead,singleObservationWrite});
   }finally{store.close();}
  }
  return {datasetVersion:PERFORMANCE_DATASET_VERSION,userAgent:navigator.userAgent,hardwareConcurrency:navigator.hardwareConcurrency,results};
 },sampleCount);
 expect(await sourceHash(),'Repository changed during benchmark; rerun against one source version').toBe(hashBefore);
 await writeFile(resolve(directory,'repository-performance.json'),JSON.stringify({measuredAt:new Date().toISOString(),browserName,repositorySourceSha256:hashBefore,nodeVersion:process.version,sampleCount,method:'Sequential measured calls after 1 warmup; nearest-rank percentiles; one synthetic dataset per size; no throttle; no production data',limitations:['Desktop headless Chromium; not a physical phone or user task time','In-memory process caching and warm IndexedDB are included','No media blobs; payload bytes are plaintext JSON not disk size','No baseline comparison or world-fastest claim','Small-sample p95 is descriptive; use default 20+ samples for a release budget decision'],...result},null,2));
 console.log('REPOSITORY_PERFORMANCE',JSON.stringify(result.results.map(row=>({years:row.years,observationP95:row.observationRead.p95Ms,attendanceP95:row.attendanceRead.p95Ms,snapshotP95:row.snapshotRead.p95Ms,writeP95:row.singleObservationWrite.p95Ms}))));
});
