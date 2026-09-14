import { useEffect,useRef,useState } from "react";
import { KeyboardInput } from "../../mobile";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import { civilDateInIstanbul } from "../../core/domain/attendance.ts";
import { requestPdfDocument,type PdfPreviewRecipe } from "../documents/pdf-preview-model.ts";
import { loadBinderKit,loadPickupSheet,type BinderKitModel,type PickupSheetModel } from "./print-kit-model.ts";
import { createBinderKitRecipe,createPickupSheetRecipe } from "./print-kit-document.ts";
import "./teacher-print-kit.css";

export interface TeacherPrintKitProps {store:LocalDataStore;refreshKey?:unknown;disabled?:boolean;onOpenPickup?:(studentId:string,civilDate:string)=>void}
export function TeacherPrintKit({store,refreshKey,disabled=false,onOpenPickup}:TeacherPrintKitProps){
  const today=civilDateInIstanbul(new Date());
  const [day,setDay]=useState(today),[month,setMonth]=useState(today.slice(0,7));
  const [pickup,setPickup]=useState<PickupSheetModel|null>(null),[binder,setBinder]=useState<BinderKitModel|null>(null),[selected,setSelected]=useState<string[]>([]);
  const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(""),[reload,setReload]=useState(0);
  const generation=useRef(0),lock=useRef(false),current=useRef({store,disabled,day,month});current.current={store,disabled,day,month};
  const selectedMonth=useRef("");
  useEffect(()=>{const version=++generation.current;setLoading(true);setError("");setPickup(null);setBinder(null);
    void Promise.allSettled([loadPickupSheet(store,day),loadBinderKit(store,month)]).then(results=>{if(version!==generation.current)return;const [p,b]=results;
      if(p.status==="fulfilled")setPickup(p.value);
      if(b.status==="fulfilled"){const sameMonth=selectedMonth.current===month;setBinder(b.value);setSelected(old=>sameMonth?old.filter(id=>b.value.inventory.items.some(i=>i.id===id)):b.value.items.map(i=>i.id));selectedMonth.current=month;}
      const problems=results.flatMap(r=>r.status==="rejected"?[r.reason instanceof Error?r.reason.message:"Belge kaynakları yüklenemedi."]:[]);setError(problems.join(" "));setLoading(false);
    });return()=>{++generation.current;};},[store,refreshKey,day,month,reload]);
  async function prepare(factory:()=>Promise<PdfPreviewRecipe>){if(lock.current||current.current.disabled||loading)return;lock.current=true;setBusy(true);setError("");const version=generation.current,scope=current.current;
    try{const recipe=await factory();if(generation.current!==version||current.current.disabled||current.current.store!==scope.store||current.current.day!==scope.day||current.current.month!==scope.month)return;await requestPdfDocument(recipe);}
    catch(reason){if(generation.current===version)setError(reason instanceof Error?reason.message:"Belge hazırlanamadı.");}
    finally{lock.current=false;setBusy(false);}
  }
  return <section className="teacher-print-kit" aria-label="Teslim çizelgesi ve klasör seti"><h2>Teslim çizelgesi ve klasör seti</h2>
    <article><h3>Günlük teslim çizelgesi</h3><p>Yatay A4 üzerinde kayıtlı yetkili kişi ve telefonlar yerleşir. Gerçek teslim kaydı varsa saati görünür; imza alanı boş kalır.</p>
      <label>Teslim çizelgesi tarihi<KeyboardInput type="date" value={day} disabled={disabled||busy} onChange={e=>{if(e.target.value)setDay(e.target.value);}}/></label>
      <button type="button" disabled={disabled||busy||loading||!pickup?.rows.length} onClick={()=>void prepare(()=>createPickupSheetRecipe(store,day))}>Günlük teslim çizelgesini hazırla</button>
      {pickup&&<details><summary>{pickup.rows.length} çocuk · Gerçek teslim kaydına geç</summary>{pickup.rows.map(r=><div key={r.studentId} className="print-kit-pickup-row"><span>{r.studentName} · {r.contacts.length} kayıtlı yetkili{r.deliveries.length?" · Teslim kaydı var":""}</span>{onOpenPickup&&<button type="button" disabled={disabled||busy} onClick={()=>onOpenPickup(r.studentId,day)}>{r.deliveries.length?"Teslim kaydını aç":"Gerçek teslimi kaydet"}</button>}</div>)}</details>}
    </article>
    <article><h3>Aylık klasör seti</h3><p>Seçtiğiniz gerçek belgelerden kapak, içindekiler, aylık ayraç ve kesilebilir sırt etiketi hazırlanır.</p>
      <label>Klasör ayı<KeyboardInput type="month" value={month} disabled={disabled||busy} onChange={e=>{if(e.target.value)setMonth(e.target.value);}}/></label>
      {binder&&<fieldset disabled={disabled||busy||loading}><legend>Klasöre alınacak belgeler</legend>{binder.inventory.items.length?binder.inventory.items.map(item=><label className="print-kit-choice" key={item.id}><input type="checkbox" checked={selected.includes(item.id)} onChange={e=>setSelected(old=>e.target.checked?[...old,item.id]:old.filter(id=>id!==item.id))}/><span>{item.title}</span></label>):<p>Bu ay için kayıtlı plan veya saklanan belge henüz yok. Bir belge hazırlayıp indirdiğinizde burada görünür.</p>}</fieldset>}
      <button type="button" disabled={disabled||busy||loading||!selected.length} onClick={()=>void prepare(()=>createBinderKitRecipe(store,month,selected))}>{selected.length} belgeyle klasör setini hazırla</button>
    </article>
    {loading&&<p role="status">Belge kaynakları yükleniyor…</p>}{error&&<div role="alert"><p>{error}</p><button type="button" disabled={busy} onClick={()=>setReload(v=>v+1)}>Kaynakları aynı seçimlerle yenile</button></div>}
  </section>;
}
