import type {LocalDataStore} from '../../core/repository/contracts.ts';
import type {EncryptedBackupEnvelope} from '../../core/backup/encrypted-backup.ts';
import {canonicalJson} from '../../core/backup/canonical-json.ts';
import {cloudStateFromSnapshot,encryptCloudState,cloudBaseline,type CloudBaseline} from './cloud-sync.ts';
import {cloudHead,uploadCloudFile,saveCloudAnchor,readCloudAnchor,readAccountStatus} from './cloud-gateway.ts';
import {createCloudRetryLoop,type RetrySessionState} from './cloud-retry.ts';

const sessions=new WeakMap<LocalDataStore,RetrySessionState>();
const changed=()=>window.dispatchEvent(new Event('maarifos-cloud-session'));
export function cloudSessionStatus(store:LocalDataStore){const state=sessions.get(store);return{active:state?.active??false,message:state?.message??''};}
export function stopCloudSession(store:LocalDataStore){sessions.get(store)?.stop();sessions.delete(store);changed();}

/** Password and an uncertain upload remain in this closure, never persisted. */
export function startCloudSession(options:{store:LocalDataStore;subject:string;password:string;version:string;canWrite:()=>boolean}){
 stopCloudSession(options.store);
 let lastFingerprint='';
 let pending:{envelope:EncryptedBackupEnvelope;headId:string|null;fingerprint:string;baseline:CloudBaseline;requestId:string}|null=null;
 const session=createCloudRetryLoop({
  online:()=>navigator.onLine,
  writable:options.canWrite,
  changed,
  schedule:(callback,delay)=>setTimeout(callback,delay),
  cancel:timer=>clearTimeout(timer),
  async attempt(){
   const status=await readAccountStatus();
   if(status.status!=='connected'||status.user.subject!==options.subject||!status.driveConnected)throw new Error('Google bağlantısı yenilenmeli. Hesap bölümünü açın.');
   if(!pending){
    const snapshot=await options.store.readSnapshot(),fingerprint=canonicalJson(snapshot);
    if(fingerprint===lastFingerprint)return;
    const anchor=await readCloudAnchor(options.subject),head=await cloudHead();
    if(head?.id!==(anchor?.headId??undefined))throw new Error('Diğer cihazda değişiklik var. Hesap bölümünde Son yedekle karşılaştır düğmesini açın.');
    const state=await cloudStateFromSnapshot(snapshot,options.version);
    pending={envelope:await encryptCloudState(state,options.password),headId:head?.id??null,fingerprint,baseline:await cloudBaseline(state),requestId:crypto.randomUUID()};
   }
   if(!session.active||!options.canWrite())return;
   // Retry the same ciphertext and ID after an uncertain response; the server
   // returns its durable receipt or rejects a newer head instead of duplicating.
   const file=await uploadCloudFile(pending.envelope,pending.headId,options.subject,pending.requestId);
   if(!session.active)return;
   await saveCloudAnchor({subject:options.subject,headId:file.id,baseline:pending.baseline});
   lastFingerprint=pending.fingerprint;pending=null;
  },
 });
 sessions.set(options.store,session);changed();session.start();
}
