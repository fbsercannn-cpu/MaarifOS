import {expect,test} from '@playwright/test';

test('automatic backup recovers an uncertain upload with the same encrypted bytes and ID',async({page})=>{
 await page.goto('/tests/runtime-fixture.html');
 await page.clock.install();
 await page.evaluate(async()=>{
  const {makeDevelopmentReportFixture}=await import('/tests/fixtures/development-report-fixture.mjs');
  const {startCloudSession,stopCloudSession,cloudSessionStatus}=await import('/src/features/cloud-account/cloud-session.ts');
  const f=await makeDevelopmentReportFixture();
  const original=window.fetch;const uploads:string[]=[];let head:null|{id:string;createdAt:string;bytes:number;digest:string}=null;
  window.fetch=async(input,options)=>{
   const path=String(input);
   if(path==='/api/account/status')return Response.json({available:true,status:'connected',user:{subject:'retry-fixture-subject',displayName:'Kurgu Öğretmen'},driveConnected:true});
   if(path==='/api/account/head')return Response.json({head});
   if(path==='/api/account/backups'&&options?.method==='POST'){
    uploads.push(String(options.body));head={id:'fixture_retry_file',createdAt:'2026-09-19T09:00:00Z',bytes:123,digest:'fixture-digest'};
    if(uploads.length===1)throw new TypeError('Fixture lost response after commit');
    return Response.json(head,{status:200});
   }
   return original(input,options);
  };
  const state={uploads,status:()=>cloudSessionStatus(f.store),stop:()=>{stopCloudSession(f.store);window.fetch=original;f.store.close();}};
  Object.assign(window,{__cloudRetryFixture:state});
  startCloudSession({store:f.store,subject:'retry-fixture-subject',password:'Fixture-only-long-recovery-key-123',version:'0.60.0',canWrite:()=>true});
 });
 try{
  await expect.poll(()=>page.evaluate(()=>window.__cloudRetryFixture.status().message)).toContain('(1/3)');
  await page.clock.fastForward(60_001);
  await expect.poll(()=>page.evaluate(()=>window.__cloudRetryFixture.status().message)).toContain('Son yedek denetimi');
  const result=await page.evaluate(async()=>{
   const f=window.__cloudRetryFixture;
   const {readCloudAnchor}=await import('/src/features/cloud-account/cloud-gateway.ts');
   const anchor=await readCloudAnchor('retry-fixture-subject');
   return {count:f.uploads.length,same:f.uploads[0]===f.uploads[1],hasPassword:f.uploads.some(text=>text.includes('Fixture-only-long-recovery-key-123')),head:anchor?.headId,active:f.status().active};
  });
  expect(result).toEqual({count:2,same:true,hasPassword:false,head:'fixture_retry_file',active:true});
 }finally{await page.evaluate(()=>window.__cloudRetryFixture.stop());}
});
