import { flushSync } from "react-dom";
import { KeyboardInput, KeyboardTextarea } from "../../mobile";
import { useEffect, useRef, useState } from "react";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import type { DataSnapshot } from "../../core/domain/model.ts";
import { resolveActiveClassroomScope } from "../../core/domain/classroom-scope.ts";
import { civilDateInIstanbul } from "../../core/domain/attendance.ts";
import { homeGameCards, homeGameSource, sameHomeGameScope } from "./home-game-card-model.ts";
import { HOME_GAME_CARDS_CHANGED, saveHomeGameCards, saveHomeGameFeedback } from "./home-game-card-service.ts";
import { createHomeGameCardRecipe } from "./home-game-card-document.ts";
import { requestPdfDocument } from "../documents/pdf-preview-model.ts";
import "./home-game-cards.css";

export interface HomeGameCardsPanelProps { store: LocalDataStore; studentId?: string; activityId?: string; civilDate?: string; onOpenPlanning?:(civilDate:string)=>void; refreshKey?: string|number; disabled?: boolean; onChanged?:()=>void|Promise<void>; }
export function HomeGameCardsPanel({store,studentId,activityId,civilDate,onOpenPlanning,refreshKey,disabled=false,onChanged}:HomeGameCardsPanelProps) {
  const [snapshot,setSnapshot]=useState<DataSnapshot|null>(null),[selected,setSelected]=useState<string[]>(studentId?[studentId]:[]),[activity,setActivity]=useState(activityId??""),[materials,setMaterials]=useState(""),[steps,setSteps]=useState(""),[message,setMessage]=useState(""),[busy,setBusy]=useState(false),[cardId,setCardId]=useState(""),[feedback,setFeedback]=useState(""),[receivedOn,setReceivedOn]=useState(civilDateInIstanbul(new Date())),[feedbackSource,setFeedbackSource]=useState<"oral"|"written">("written");
  const autoFilled=useRef("");
  const lock=useRef(false),generation=useRef(0),blocked=useRef(disabled); blocked.current=disabled;
  useEffect(()=>{let live=true; const load=()=>{store.readSnapshot().then(s=>{if(live)setSnapshot(s);}).catch(()=>{if(live)setMessage("Kart kayıtları okunamadı.");});}; load(); window.addEventListener(HOME_GAME_CARDS_CHANGED,load); return()=>{live=false; generation.current++; window.removeEventListener(HOME_GAME_CARDS_CHANGED,load);};},[store,refreshKey]);
  useEffect(()=>{generation.current++;autoFilled.current="";setSelected(studentId?[studentId]:[]);setActivity(activityId??"");},[studentId,activityId]);
  useEffect(()=>{if(!snapshot||!activityId||!studentId||autoFilled.current===`${studentId}:${activityId}`)return;const scope=resolveActiveClassroomScope(snapshot);if(!scope)return;try{const source=homeGameSource(snapshot,scope,studentId,activityId);setMaterials(source.materials);setSteps(source.description);autoFilled.current=`${studentId}:${activityId}`;}catch{ /* The selected source is unavailable; the selector and save guard expose this. */ }},[snapshot,studentId,activityId]);
  const scope=snapshot&&resolveActiveClassroomScope(snapshot);
  const students=snapshot&&scope?snapshot.students.filter(s=>!s.deletedAt&&s.active!==false&&sameHomeGameScope(scope,s)&&(!studentId||s.id===studentId)):[];
  const activities=snapshot&&scope?snapshot.activities.filter(a=>!a.deletedAt&&a.status!=="cancelled"&&a.activityKind!=="spontaneous-observation"&&sameHomeGameScope(scope,a)&&(!civilDate||a.civilDate===civilDate)&&(!activityId||a.id===activityId)&&selected.every(id=>!Array.isArray(a.studentIds)||a.studentIds.length===0||a.studentIds.includes(id))):[];
  const records=snapshot&&scope?homeGameCards(snapshot).filter(r=>sameHomeGameScope(scope,r)&&(!studentId||r.studentId===studentId)):[];
  const cards=records.filter(r=>r.workflow.kind==="prepared"&&(!civilDate||snapshot?.activities.some(a=>r.workflow.kind==="prepared"&&a.id===r.workflow.activityId&&a.civilDate===civilDate)));
  const chosenCard=cards.find(r=>r.id===cardId);
  const fill=(id:string)=>{setActivity(id);setMessage("");if(snapshot&&scope&&selected[0]&&id){try{const source=homeGameSource(snapshot,scope,selected[0],id);setMaterials(source.materials);setSteps(source.description);}catch{setMaterials("");setSteps("");}}};
  const run=async(task:()=>Promise<void>)=>{if(lock.current||blocked.current)return;lock.current=true;setBusy(true);setMessage("");try{await task();}catch(error){setMessage(error instanceof Error?error.message:"Kart işlemi tamamlanamadı.");}finally{lock.current=false;setBusy(false);}};
  const showPdf=async(ids:string[])=>{const token=generation.current;const recipe=await createHomeGameCardRecipe(store,ids);if(token===generation.current&&!blocked.current)await requestPdfDocument(recipe);};
  return <section className="home-game-cards" aria-label="Aileye ev oyunu kartı"><h3>Aileye ev oyunu kartı</h3><p>Çocukları ve mevcut etkinliği seçin. Kayıtlı açıklama varsa yerleşir; evde oynanacak kısa adımları kontrol edip kartı hazırlayın. A4 üzerinde iki A5 kart; tek çocukta iki nüsha.</p>
    {civilDate&&<p>{civilDate} günü için aile kartları</p>}{civilDate&&snapshot&&!activities.length&&onOpenPlanning&&<button type="button" onClick={()=>onOpenPlanning(civilDate)}>Bu güne etkinlik yerleştir</button>}<fieldset disabled={disabled||busy}><legend>Kart hazırlanacak çocuklar</legend>{students.map(s=><label key={s.id}><input type="checkbox" checked={selected.includes(s.id)} onChange={e=>setSelected(v=>e.target.checked?[...v,s.id]:v.filter(id=>id!==s.id))}/>{String(s.displayName)}</label>)}</fieldset>
    <label>Kaynak etkinlik<select aria-label="Kaynak etkinlik" value={activity} disabled={disabled||busy} onChange={e=>fill(e.target.value)}><option value="">Etkinlik seçin</option>{activities.map(a=><option key={a.id} value={a.id}>{a.civilDate} · {String(a.title)}</option>)}</select></label>
    <label>Malzemeler<KeyboardTextarea aria-label="Malzemeler" value={materials} maxLength={8000} disabled={disabled||busy} onChange={e=>setMaterials(e.target.value)}/></label>
    <button type="button" disabled={disabled||busy} onClick={()=>setMaterials("Malzeme gerektirmez.")}>Bu oyun malzeme gerektirmez</button>
    <label>Evde oyun adımları<KeyboardTextarea aria-label="Evde oyun adımları" value={steps} maxLength={16000} disabled={disabled||busy} onChange={e=>setSteps(e.target.value)}/></label>
    <button type="button" disabled={disabled||busy||!selected.length||!activity||!materials.trim()||!steps.trim()} onClick={()=>void run(async()=>{if(!snapshot||!scope)return;const expectedFingerprints=Object.fromEntries(selected.map(id=>[id,homeGameSource(snapshot,scope,id,activity).fingerprint]));const saved=await saveHomeGameCards(store,{studentIds:selected,activityId:activity,materials,steps,expectedFingerprints});setCardId(saved[0]!.id);let changed: void|Promise<void>;flushSync(()=>{changed=onChanged?.();});await changed!;await showPdf(saved.map(r=>r.id));setMessage("Ev oyunu kartları kaydedildi. Aileye gönderildiği veya uygulandığı kaydedilmedi.");})}>{busy?"Hazırlanıyor…":"Kartları kaydet ve PDF'yi aç"}</button>
    <h4>Kayıtlı kart ve gerçek aile yanıtı</h4><label>Kayıtlı kart<select aria-label="Kayıtlı kart" value={cardId} disabled={disabled||busy} onChange={e=>setCardId(e.target.value)}><option value="">Kart seçin</option>{cards.map(c=><option key={c.id} value={c.id}>{String(snapshot?.students.find(s=>s.id===c.studentId)?.displayName??"")} · {c.workflow.kind==="prepared"?c.workflow.title:""} · {c.civilDate}</option>)}</select></label>
    {chosenCard&&<><button type="button" disabled={disabled||busy} onClick={()=>void run(()=>showPdf([chosenCard.id]))}>Kayıtlı kartın PDF'sini aç</button><label>Yanıtın geldiği tarih<KeyboardInput type="date" aria-label="Yanıtın geldiği tarih" value={receivedOn} max={civilDateInIstanbul(new Date())} disabled={disabled||busy} onChange={e=>setReceivedOn(e.target.value)}/></label><label>Yanıtın kaynağı<select aria-label="Yanıtın kaynağı" value={feedbackSource} disabled={disabled||busy} onChange={e=>setFeedbackSource(e.target.value as "oral"|"written")}><option value="written">Yazılı yanıt</option><option value="oral">Sözlü yanıt</option></select></label><label>Ailenin gerçek geri bildirimi<KeyboardTextarea aria-label="Ailenin gerçek geri bildirimi" value={feedback} disabled={disabled||busy} maxLength={8000} onChange={e=>setFeedback(e.target.value)}/></label><button type="button" disabled={disabled||busy||!feedback.trim()} onClick={()=>void run(async()=>{await saveHomeGameFeedback(store,{cardId:chosenCard.id,receivedOn,source:feedbackSource,text:feedback});setFeedback("");await onChanged?.();setMessage("Aile yanıtı aynı çocuk ve etkinliğe kaydedildi.");})}>Gelen aile yanıtını kaydet</button>{records.filter(r=>r.workflow.kind==="feedback"&&r.workflow.cardId===chosenCard.id).map(r=><blockquote key={r.id}>{r.workflow.kind==="feedback"?`${r.workflow.receivedOn} — ${r.workflow.text}`:""}</blockquote>)}</>}
    {message&&<p role="status">{message}</p>}
  </section>;
}



