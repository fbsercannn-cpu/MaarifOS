import {BackupService} from '../../core/backup/backup-service.ts';
import {encryptBackupText,decryptBackupText,type EncryptedBackupEnvelope} from '../../core/backup/encrypted-backup.ts';
import {canonicalJson} from '../../core/backup/canonical-json.ts';
import type {BackupEnvelope} from '../../core/backup/schema.ts';
import {COLLECTION_NAMES,createEmptySnapshot,type DataSnapshot,type CollectionName,type StoredRecord} from '../../core/domain/model.ts';
import type {LocalDataStore,StudentPrivacyDeletionRepository} from '../../core/repository/contracts.ts';
import {permanentlyDeleteStudent,previewPermanentStudentDeletion} from '../students/student-lifecycle.ts';
import {isStudentErasure,studentErasureHashes} from '../../core/domain/student-erasure.ts';
import {sha256Hex} from '../../core/backup/crypto.ts';

export interface CloudState{format:'maarifos-cloud-state-v1';backup:BackupEnvelope;erasedStudentHashes:string[];}
export interface SyncConflict{key:string;collection:CollectionName;id:string;local:StoredRecord|null;remote:StoredRecord|null;}
export interface CloudBaseline{format:'maarifos-cloud-baseline-v1';records:Record<CollectionName,Record<string,string>>;erasedStudentHashes:string[];}
export interface SyncPreview{localFingerprint:string;base:CloudState|CloudBaseline|null;local:CloudState;remote:CloudState;conflicts:SyncConflict[];merged:DataSnapshot;erasedStudentIds:string[];}
export type SyncChoices=Record<string,'local'|'remote'>;
const equal=(a:unknown,b:unknown)=>canonicalJson(a??null)===canonicalJson(b??null);
/** Detached transaction store; no persistent data is touched while composing/validating a merge. */
export function detachedCloudStore(initial:DataSnapshot):LocalDataStore&StudentPrivacyDeletionRepository{
  let snapshot=structuredClone(initial);
  const store:LocalDataStore&StudentPrivacyDeletionRepository={close(){},readSnapshot:async()=>structuredClone(snapshot),transaction:async(mode,names,task)=>{const working=structuredClone(snapshot);const result=await task({getAll:async name=>structuredClone(working[name]) as never,clear:async name=>{working[name]=[];},putMany:async(name:CollectionName,records:readonly StoredRecord[])=>{const rows=new Map(working[name].map(row=>[row.id,row]));for(const row of records)rows.set(row.id,structuredClone(row));working[name]=[...rows.values()];}});if(mode==='readwrite')for(const name of names)snapshot[name]=working[name];return result;},transactionWithStudentRecoveryPurge:async(_id,task)=>({result:await store.transaction('readwrite',COLLECTION_NAMES,task),purgedRecoverySnapshotCount:0})};return store;
}
export async function cloudStateFromSnapshot(snapshot:DataSnapshot,version:string,erasedStudentHashes:string[]=[]):Promise<CloudState>{return{format:'maarifos-cloud-state-v1',backup:await new BackupService(detachedCloudStore(snapshot),{appVersion:version}).exportBackup(),erasedStudentHashes:[...new Set([...erasedStudentHashes,...studentErasureHashes(snapshot)])].sort()};}
export async function encryptCloudState(state:CloudState,password:string):Promise<EncryptedBackupEnvelope>{return encryptBackupText(canonicalJson(state),{appVersion:state.backup.manifest.appVersion,createdAt:state.backup.manifest.createdAt},password);}
export async function decryptCloudState(input:string|EncryptedBackupEnvelope,password:string,version:string):Promise<CloudState>{const value:unknown=JSON.parse(await decryptBackupText(input,password));if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Yedek biçimi geçersiz.');const row=value as Record<string,unknown>;if(row.format!=='maarifos-cloud-state-v1'||Object.keys(row).some(k=>!['format','backup','erasedStudentHashes'].includes(k))||!Array.isArray(row.erasedStudentHashes)||row.erasedStudentHashes.some(id=>typeof id!=='string'||!/^[a-f0-9]{64}$/.test(id)))throw new Error('MaarifOS bulut yedeği bekleniyor.');const backup=await new BackupService(detachedCloudStore(createEmptySnapshot()),{appVersion:version}).parseAndVerifyBackup(row.backup as BackupEnvelope);return{format:'maarifos-cloud-state-v1',backup,erasedStudentHashes:[...new Set([...(row.erasedStudentHashes as string[]),...studentErasureHashes(backup.payload)])].sort()};}
export async function cloudBaseline(state:CloudState):Promise<CloudBaseline>{const records={} as CloudBaseline['records'];for(const name of COLLECTION_NAMES)records[name]=Object.fromEntries(await Promise.all(state.backup.payload[name].map(async row=>[await sha256Hex(row.id),await sha256Hex(canonicalJson(row))])));return{format:'maarifos-cloud-baseline-v1',records,erasedStudentHashes:[...state.erasedStudentHashes]};}
export async function previewCloudMerge(base:CloudState|CloudBaseline|null,local:CloudState,remote:CloudState):Promise<SyncPreview>{
  const baseline=base?(base.format==='maarifos-cloud-state-v1'?await cloudBaseline(base):base):null;
  const merged=createEmptySnapshot(),conflicts:SyncConflict[]=[];const hashes=new Set([...local.erasedStudentHashes,...remote.erasedStudentHashes,...(base?.erasedStudentHashes??[])]),erased=new Set<string>();
  const students=[...new Set([...local.backup.payload.students,...remote.backup.payload.students].map(row=>row.id))];
  for(const id of students)if(hashes.has(await sha256Hex(id)))erased.add(id);
  for(const name of COLLECTION_NAMES){const l=new Map(local.backup.payload[name].map(r=>[r.id,r])),r=new Map(remote.backup.payload[name].map(r=>[r.id,r]));for(const id of [...new Set([...l.keys(),...r.keys()])].sort()){
    const left=l.get(id)??null,right=r.get(id)??null,oldHash=baseline?.records[name][await sha256Hex(id)]??null,leftHash=left?await sha256Hex(canonicalJson(left)):null,rightHash=right?await sha256Hex(canonicalJson(right)):null;let picked:StoredRecord|null;
    if(name==='students'&&erased.has(id))picked=left??right; // retain temporarily so the canonical erasure service can remove every relationship
    else if(name==='students'&&(!left||!right))picked=left??right; // An absent/older snapshot is not proof of permanent erasure.
    else if(isStudentErasure(left)&&isStudentErasure(right))picked=left.createdAt<right.createdAt?left:right;
    else if(equal(left,right))picked=left;else if(baseline&&leftHash===oldHash)picked=right;else if(baseline&&rightHash===oldHash)picked=left;else if(!oldHash&&!left)picked=right;else if(!oldHash&&!right)picked=left;else{conflicts.push({key:`${name}:${id}`,collection:name,id,local:left,remote:right});picked=left;}
    if(picked)merged[name].push(structuredClone(picked));
  }}
  return{localFingerprint:canonicalJson(local.backup.payload),base,local,remote,conflicts,merged,erasedStudentIds:[...erased].sort()};
}
export async function resolveCloudMerge(preview:SyncPreview,choices:SyncChoices,version:string):Promise<CloudState>{const snapshot=structuredClone(preview.merged);for(const conflict of preview.conflicts){const side=choices[conflict.key];if(!side)throw new Error('Değişen kayıt için bu cihazı veya diğer cihazı seçin.');const picked=side==='local'?conflict.local:conflict.remote;snapshot[conflict.collection]=snapshot[conflict.collection].filter(r=>r.id!==conflict.id);if(picked)snapshot[conflict.collection].push(structuredClone(picked));}
  return applyCloudErasures(snapshot,[...preview.local.erasedStudentHashes,...preview.remote.erasedStudentHashes,...(preview.base?.erasedStudentHashes??[]),...await Promise.all(preview.erasedStudentIds.map(sha256Hex))],version);
}
/** Delete wins across devices. Stage relationship cleanup before validating the final backup. */
export async function applyCloudErasures(snapshot:DataSnapshot,hashes:string[],version:string):Promise<CloudState>{
  const working=structuredClone(snapshot),markers=working.settings.filter(isStudentErasure),allHashes=new Set([...hashes,...markers.map(row=>row.erasedStudentHash)]);
  working.settings=working.settings.filter(row=>!isStudentErasure(row));
  const staged=detachedCloudStore(working);
  for(const student of working.students){if(!allHashes.has(await sha256Hex(student.id)))continue;const current=await staged.readSnapshot(),impact=previewPermanentStudentDeletion(current,student.id);await permanentlyDeleteStudent(staged,{studentId:student.id,confirmationName:impact.displayName,expectedFingerprint:impact.fingerprint});}
  const final=await staged.readSnapshot(),byId=new Map(final.settings.map(row=>[row.id,row]));for(const marker of markers)if(!byId.has(marker.id))byId.set(marker.id,marker);final.settings=[...byId.values()];
  return cloudStateFromSnapshot(final,version,[...allHashes]);
}
export async function restoreCloudState(store:LocalDataStore,state:CloudState,expectedFingerprint:string,version:string){
  const current=await store.readSnapshot();
  if(canonicalJson(current)!==expectedFingerprint)throw new Error('Bu cihazdaki kayıtlar değişti. Güncel farkları yeniden hazırlayın.');
  state=await applyCloudErasures(state.backup.payload,[...state.erasedStudentHashes,...studentErasureHashes(current)],version);
  let committed=false;
  const guarded=new Proxy(store,{get(target,property){if(property==='readSnapshot')return async()=>{const snapshot=await target.readSnapshot();if(!committed&&canonicalJson(snapshot)!==expectedFingerprint)throw new Error('Bu cihazdaki kayıtlar değişti. Güncel farkları yeniden hazırlayın.');return snapshot;};if(property==='transaction')return async(mode:'readonly'|'readwrite',names:readonly CollectionName[],task:Parameters<LocalDataStore['transaction']>[2])=>{const result=await target.transaction(mode,names,async tx=>{if(mode==='readwrite'&&!committed){const current=createEmptySnapshot();for(const name of COLLECTION_NAMES)current[name]=await tx.getAll(name);if(canonicalJson(current)!==expectedFingerprint)throw new Error('Kayıtlar seçimden sonra değişti. Yeniden karşılaştırın.');}return task(tx);});if(mode==='readwrite')committed=true;return result;};const value=Reflect.get(target,property,target);return typeof value==='function'?value.bind(target):value;}});
  return new BackupService(guarded,{appVersion:version}).restoreBackup(state.backup,{mode:'replace'});
}
