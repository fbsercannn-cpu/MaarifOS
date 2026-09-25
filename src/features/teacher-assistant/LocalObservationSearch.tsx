import {useEffect,useMemo,useRef,useState} from 'react';
import {KeyboardInput} from '../../mobile';
import type {LocalDataStore} from '../../core/repository/contracts.ts';
import type {DataSnapshot} from '../../core/domain/model.ts';
import {observationSearchModel,type ObservationSearchFilter} from './assistant-tools.ts';
import './assistant-tools.css';

export function LocalObservationSearch({store,disabled=false,onOpenObservation}:{store:LocalDataStore;disabled?:boolean;onOpenObservation?:(id:string)=>void}){
 const [snapshot,setSnapshot]=useState<DataSnapshot|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[open,setOpen]=useState(false),[limit,setLimit]=useState(30);
 const [filter,setFilter]=useState<ObservationSearchFilter>({query:'',studentId:'',activityId:'',dateFrom:'',dateTo:''});
 const epoch=useRef(0),disabledRef=useRef(disabled);disabledRef.current=disabled;
 useEffect(()=>{epoch.current++;setSnapshot(null);setBusy(false);return()=>{epoch.current++;};},[store,disabled]);
 async function load(){if(disabledRef.current)return;const current=++epoch.current;setBusy(true);setError('');try{const value=await store.readSnapshot();if(current===epoch.current&&!disabledRef.current)setSnapshot(value);}catch{if(current===epoch.current)setError('Kayıtlar açılamadı. Cihaz kilidini ve yerel depolamayı denetleyip yeniden deneyin.');}finally{if(current===epoch.current)setBusy(false);}}
 const model=useMemo(()=>{if(!snapshot)return null;try{return {data:observationSearchModel(snapshot,filter),error:''};}catch(e){return {data:null,error:e instanceof Error?e.message:'Arama hazırlanamadı.'};}},[snapshot,filter]);
 function change<K extends keyof ObservationSearchFilter>(key:K,value:ObservationSearchFilter[K]){setFilter(previous=>({...previous,[key]:value}));setLimit(30);}
 return <details className="assistant-tool" open={open} onToggle={e=>{const next=e.currentTarget.open;setOpen(next);if(next&&!snapshot&&!busy)void load();if(!next){epoch.current++;setSnapshot(null);setBusy(false);}}}><summary>Gözlemlerimde hızlı bul</summary><p>Yalnız bu cihazdaki etkin sınıf ve eğitim yılının kayıtlarını arar. Arama metni ve sonuçlar başka bir yere gönderilmez.</p>
 <button type="button" disabled={disabled||busy} onClick={()=>void load()}>Kayıtları yenile</button>{disabled&&<p role="status">Kayıtları görmek için cihazın kilidini açın.</p>}{busy&&<p role="status">Yerel kayıtlar okunuyor…</p>}{error&&<p role="alert">{error}</p>}
 <div className="assistant-tool__filters"><label>Metinde, çocukta veya etkinlikte ara<KeyboardInput type="search" autoComplete="off" disabled={disabled} value={filter.query} onChange={e=>change('query',e.target.value)}/></label>
 <label>Çocuk<select disabled={disabled} value={filter.studentId} onChange={e=>change('studentId',e.target.value)}><option value="">Sınıftaki tüm çocuklar</option>{model?.data?.students.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
 <label>Etkinlik<select disabled={disabled} value={filter.activityId} onChange={e=>change('activityId',e.target.value)}><option value="">Tüm etkinlikler</option>{model?.data?.activities.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
 <label>Başlangıç günü<KeyboardInput type="date" disabled={disabled} value={filter.dateFrom} onChange={e=>change('dateFrom',e.target.value)}/></label><label>Bitiş günü<KeyboardInput type="date" disabled={disabled} value={filter.dateTo} onChange={e=>change('dateTo',e.target.value)}/></label></div>
 {model?.error&&<p role="alert">{model.error}</p>}{model?.data&&!model.data.scope&&<p role="status">Önce etkin sınıfı seçin.</p>}{model?.data?.scope&&<><p role="status">{model.data.results.length} kayıt bulundu.</p><ol className="assistant-tool__results">{model.data.results.slice(0,limit).map(row=><li key={row.id}><strong>{row.civilDate} · {row.studentNames||'Katılımcı kaydı bulunamadı'}</strong><p>{row.activityTitle}</p><p className="assistant-tool__raw">{row.rawText}</p>{onOpenObservation&&<button type="button" disabled={disabled} onClick={()=>onOpenObservation(row.id)}>Kaydı aç</button>}</li>)}</ol>{model.data.results.length>limit&&<button type="button" onClick={()=>setLimit(n=>n+30)}>Sonraki 30 kaydı göster</button>}</>}
 </details>;
}
