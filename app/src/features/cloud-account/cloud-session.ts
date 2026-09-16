import type {LocalDataStore} from '../../core/repository/contracts.ts';
import {canonicalJson} from '../../core/backup/canonical-json.ts';
import {cloudStateFromSnapshot,encryptCloudState,cloudBaseline} from './cloud-sync.ts';
import {cloudHead,uploadCloudFile,saveCloudAnchor,readCloudAnchor,readAccountStatus} from './cloud-gateway.ts';
type Session={stop:()=>void;message:string;active:boolean};
const sessions=new WeakMap<LocalDataStore,Session>();
const changed=()=>window.dispatchEvent(new Event('maarifos-cloud-session'));
export function cloudSessionStatus(store:LocalDataStore){const state=sessions.get(store);return{active:state?.active??false,message:state?.message??''};}
export function stopCloudSession(store:LocalDataStore){sessions.get(store)?.stop();sessions.delete(store);changed();}
/** The recovery key lives only in this closure. Reloading/closing the app ends this session. */
export function startCloudSession(options:{store:LocalDataStore;subject:string;password:string;version:string;canWrite:()=>boolean}){
 stopCloudSession(options.store);let busy=false,stopped=false,lastFingerprint='';
 const session:Session={active:true,message:'Bu oturumda otomatik yedek açık. Uygulama açıkken her dakika değişiklikler denetlenir.',stop(){stopped=true;clearInterval(timer);session.active=false;}};
 const tick=async()=>{if(busy||stopped||!navigator.onLine||!options.canWrite())return;busy=true;try{
  const status=await readAccountStatus();if(status.status!=='connected'||status.user.subject!==options.subject||!status.driveConnected)throw new Error('Google bağlantısı yenilenmeli. Hesap bölümünü açın.');
  const snapshot=await options.store.readSnapshot(),fingerprint=canonicalJson(snapshot);if(fingerprint===lastFingerprint)return;
  const anchor=await readCloudAnchor(options.subject),head=await cloudHead();
  if(head?.id!==(anchor?.headId??undefined))throw new Error('Diğer cihazda değişiklik var. Hesap bölümünde Son yedekle karşılaştır düğmesini açın.');
  const state=await cloudStateFromSnapshot(snapshot,options.version),envelope=await encryptCloudState(state,options.password);
  if(stopped||!options.canWrite())return;
  const file=await uploadCloudFile(envelope,head?.id??null,options.subject);await saveCloudAnchor({subject:options.subject,headId:file.id,baseline:await cloudBaseline(state)});lastFingerprint=fingerprint;
  session.message=`Son otomatik yedek: ${new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Istanbul'})}.`;
 }catch(error){session.stop();session.message=error instanceof Error?error.message:'Yedek tamamlanamadı. Hesap bölümünden yeniden deneyin.';}finally{busy=false;changed();}};
 const timer=setInterval(()=>void tick(),60_000);sessions.set(options.store,session);changed();void tick();
}
