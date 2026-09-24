import test from 'node:test';
import assert from 'node:assert/strict';
import {CloudRequestError,cloudRetryDelay,createCloudRetryLoop} from '../../src/features/cloud-account/cloud-retry.ts';
import {readAccountStatus,uploadCloudFile} from '../../src/features/cloud-account/cloud-gateway.ts';

const flush=()=>new Promise(resolve=>setImmediate(resolve));
function harness(attempt){let scheduled=null,online=true,writable=true;const delays=[];const state=createCloudRetryLoop({attempt,online:()=>online,writable:()=>writable,changed(){},schedule(fn,delay){scheduled=fn;delays.push(delay);return 1;},cancel(){scheduled=null;}});return {state,delays,setOnline(v){online=v;},setWritable(v){writable=v;},async next(){const fn=scheduled;scheduled=null;fn?.();await flush();}};}

test('temporary failure retries at bounded 1/2/4 minutes and then pauses',async()=>{
 let calls=0;const f=harness(async()=>{calls++;throw new CloudRequestError('Temporary',502,true);});f.state.start();await flush();await f.next();await f.next();await f.next();assert.equal(calls,4);assert.deepEqual(f.delays,[60000,120000,240000]);assert.equal(f.state.active,false);assert.equal(cloudRetryDelay(4),null);
});
test('offline and locked periods preserve retry budget; successful recovery resets it',async()=>{
 let calls=0;const f=harness(async()=>{if(++calls===1)throw new CloudRequestError('Temporary',503,true);});f.setOnline(false);f.state.start();await flush();assert.equal(calls,0);f.setOnline(true);await f.next();assert.equal(calls,1);f.setWritable(false);await f.next();assert.equal(calls,1);f.setWritable(true);await f.next();assert.equal(calls,2);assert.equal(f.state.active,true);assert.match(f.state.message,/Son yedek denetimi/u);f.state.stop();
});
test('authorization, conflict, invalid data and storage errors never retry automatically',async()=>{
 for(const error of [new CloudRequestError('Permission',403),new CloudRequestError('Conflict',409),new Error('Storage')]){let calls=0;const f=harness(async()=>{calls++;throw error;});f.state.start();await flush();await f.next();assert.equal(calls,1);assert.equal(f.state.active,false);assert.deepEqual(f.delays,[]);}
});
test('stopping while a request is in flight never schedules another attempt',async()=>{
 let release;const f=harness(()=>new Promise(resolve=>release=resolve));f.state.start();f.state.stop();release();await flush();assert.equal(f.state.active,false);assert.deepEqual(f.delays,[]);
});
test('static hosting 404 is an explicit unavailable configuration; network errors stay retryable',async()=>{
 const original=globalThis.fetch;try{globalThis.fetch=async()=>new Response('<html>Not found</html>',{status:404});assert.deepEqual(await readAccountStatus(),{available:false,status:'not_configured'});globalThis.fetch=async()=>{throw new TypeError('Network');};await assert.rejects(readAccountStatus,error=>error instanceof CloudRequestError&&error.retryable);}finally{globalThis.fetch=original;}
});
test('invalid status cannot enable sign-in and uncertain writes are never transport-retried',async()=>{
 const original=globalThis.fetch;try{for(const body of [null,{status:'connected',available:true,user:{subject:'x',displayName:'Test'}},{status:'not_connected',available:false}]){globalThis.fetch=async()=>Response.json(body);await assert.rejects(readAccountStatus);}let calls=0;globalThis.fetch=async()=>{calls++;return Response.json({error:'Unavailable'},{status:502});};await assert.rejects(()=>uploadCloudFile({},null,'fixture-subject','fixture-operation'),error=>error.retryable);assert.equal(calls,1);}finally{globalThis.fetch=original;}
});
